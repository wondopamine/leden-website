#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const DATABASE_CONTAINER = "supabase_db_leden-website-local";
const PSQL_ARGS = [
  "exec",
  "-i",
  DATABASE_CONTAINER,
  "psql",
  "-U",
  "postgres",
  "-d",
  "postgres",
  "-X",
  "-qAt",
  "-v",
  "ON_ERROR_STOP=1",
];
const MENU_ITEM_ID = "d2000000-0000-4000-8000-000000000001";
const REQUIRED_OPTION_ID = "d4000000-0000-4000-8000-000000000001";
const STAFF_USER_ID = "fa000000-0000-4000-8000-000000000001";
const RACE_IDENTITIES = {
  identical: "fa100000-0000-4000-8000-000000000001",
  price: "fa100000-0000-4000-8000-000000000002",
  modifiers: "fa100000-0000-4000-8000-000000000003",
  transition: "fa100000-0000-4000-8000-000000000004",
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runSql(sql) {
  return execFileSync("docker", [...PSQL_ARGS, "-c", sql], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function quoteLiteral(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function createSql(identity, tokenByte, customerName = "Race Fixture") {
  return `
    select private.create_order_v1_at(
      '${identity}', decode(repeat('${tokenByte}', 32), 'hex'),
      ${quoteLiteral(customerName)}, '(514) 555-0199', 'en', null, 'asap', null,
      '[{"menu_item_id":"${MENU_ITEM_ID}","quantity":1,"option_ids":["${REQUIRED_OPTION_ID}"]}]'::jsonb,
      '2026-08-24 12:00:00+00'::timestamptz
    )
  `;
}

class PsqlSession {
  constructor(applicationName) {
    this.applicationName = applicationName;
    this.partialLine = "";
    this.pending = null;
    this.stderr = "";
    this.sequence = 0;
    this.process = spawn("docker", PSQL_ARGS, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.process.stdout.setEncoding("utf8");
    this.process.stderr.setEncoding("utf8");
    this.process.stdout.on("data", (chunk) => this.consume(chunk));
    this.process.stderr.on("data", (chunk) => {
      this.stderr += chunk;
    });
    this.process.on("exit", (code) => {
      if (this.pending) {
        this.pending.reject(
          new Error(
            `${this.applicationName} exited ${code}: ${this.stderr.trim()}`
          )
        );
        this.pending = null;
      }
    });
  }

  consume(chunk) {
    const lines = `${this.partialLine}${chunk}`.split("\n");
    this.partialLine = lines.pop() ?? "";
    for (const line of lines) {
      if (!this.pending) {
        continue;
      }
      if (line.trim() === this.pending.marker) {
        const { output, resolve } = this.pending;
        this.pending = null;
        resolve(output.join("\n").trim());
      } else {
        this.pending.output.push(line);
      }
    }
  }

  run(sql) {
    assert(!this.pending, `${this.applicationName} already has a pending command`);
    const marker = `__OLH_${this.sequence}_${randomUUID()}__`;
    this.sequence += 1;
    return new Promise((resolve, reject) => {
      this.pending = { marker, output: [], resolve, reject };
      this.process.stdin.write(`${sql.trim().replace(/;?$/, ";")}\n\\echo ${marker}\n`);
    });
  }

  async initialize() {
    await this.run(`set application_name = ${quoteLiteral(this.applicationName)}`);
  }

  close() {
    if (!this.process.killed) {
      this.process.stdin.end("\\q\n");
    }
  }
}

async function openSession(name) {
  const session = new PsqlSession(name);
  await session.initialize();
  return session;
}

async function waitForDatabaseLock(applicationName, timeoutMilliseconds = 5000) {
  const deadline = Date.now() + timeoutMilliseconds;
  while (Date.now() < deadline) {
    const waiting = runSql(`
      select exists (
        select 1
        from pg_catalog.pg_stat_activity
        where application_name = ${quoteLiteral(applicationName)}
          and wait_event_type = 'Lock'
      )
    `);
    if (waiting === "t") {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`${applicationName} never reached an observed database lock`);
}

async function withSessions(names, callback) {
  const sessions = [];
  try {
    for (const name of names) {
      sessions.push(await openSession(name));
    }
    return await callback(...sessions);
  } finally {
    for (const session of sessions) {
      session.close();
    }
  }
}

function cleanupFixtures() {
  runSql(`
    select public.cleanup_lifecycle_test_order_v1(id)
    from public.orders
    where idempotency_key in (
      '${RACE_IDENTITIES.identical}', '${RACE_IDENTITIES.price}',
      '${RACE_IDENTITIES.modifiers}', '${RACE_IDENTITIES.transition}'
    );
    delete from public.admin_users where user_id = '${STAFF_USER_ID}';
    delete from auth.users where id = '${STAFF_USER_ID}';
    update public.menu_items
    set price = 5.00, status = 'available', available = true
    where id = '${MENU_ITEM_ID}';
  `);
}

function assertLocalTarget() {
  const environment = runSql(`
    select environment
    from private.lifecycle_environment_sentinel
    where singleton = true
  `);
  assert(
    environment === "local",
    "Race tests refuse to mutate a database without the protected local sentinel"
  );
}

async function proveIdenticalCreateRace() {
  const appA = "olh-race-create-a";
  const appB = "olh-race-create-b";
  await withSessions([appA, appB], async (sessionA, sessionB) => {
    await sessionA.run("begin");
    await sessionA.run(`
      select pg_catalog.pg_advisory_xact_lock(
        pg_catalog.hashtextextended('${RACE_IDENTITIES.identical}', 0)
      )
    `);
    const loser = sessionB.run(createSql(RACE_IDENTITIES.identical, "c1"));
    await waitForDatabaseLock(appB);
    const winnerReceipt = await sessionA.run(
      createSql(RACE_IDENTITIES.identical, "c1")
    );
    await sessionA.run("commit");
    const retryReceipt = await loser;
    assert(winnerReceipt === retryReceipt, "identical racers returned different receipts");
  });

  const persisted = runSql(`
    select count(*) || '|' || count(item.id) || '|' || count(event.id)
    from public.orders as order_header
    left join public.order_items as item on item.order_id = order_header.id
    left join public.order_status_events as event on event.order_id = order_header.id
    where order_header.idempotency_key = '${RACE_IDENTITIES.identical}'
  `);
  assert(persisted === "1|1|1", `identical create race persisted ${persisted}`);
}

async function provePriceCheckoutRace() {
  const appA = "olh-race-price-a";
  const appB = "olh-race-price-b";
  await withSessions([appA, appB], async (sessionA, sessionB) => {
    await sessionA.run("begin");
    await sessionA.run(`
      update public.menu_items set price = 6.25 where id = '${MENU_ITEM_ID}'
    `);
    const checkout = sessionB.run(createSql(RACE_IDENTITIES.price, "c2"));
    await waitForDatabaseLock(appB);
    await sessionA.run("commit");
    await checkout;
  });

  const snapshot = runSql(`
    select item.price || '|' || item.unit_price || '|' || order_header.subtotal
    from public.orders as order_header
    join public.order_items as item on item.order_id = order_header.id
    where order_header.idempotency_key = '${RACE_IDENTITIES.price}'
  `);
  assert(snapshot === "6.25|6.25|6.25", `checkout observed mixed price state: ${snapshot}`);
  runSql(`update public.menu_items set price = 5.00 where id = '${MENU_ITEM_ID}'`);
}

async function proveModifierGraphCheckoutRace() {
  const appA = "olh-race-modifier-a";
  const appB = "olh-race-modifier-b";
  await withSessions([appA, appB], async (sessionA, sessionB) => {
    await sessionA.run("begin");
    await sessionA.run(`set local "request.jwt.claim.sub" = '${STAFF_USER_ID}'`);
    await sessionA.run("set local role authenticated");
    await sessionA.run(`
      select public.save_menu_item_graph_v1(
        '${MENU_ITEM_ID}',
        '{"category_id":"d1000000-0000-4000-8000-000000000001","name_en":"Lifecycle test latte","name_fr":"Latté de test du cycle","description_en":"Synthetic","description_fr":"Synthétique","price":5.00,"status":"available","sort_order":1}'::jsonb,
        '[]'::jsonb
      )
    `);
    const checkout = sessionB.run(createSql(RACE_IDENTITIES.modifiers, "c3"));
    await waitForDatabaseLock(appB);
    await sessionA.run("rollback");
    await checkout;
  });

  const snapshot = runSql(`
    select jsonb_array_length(item.modifiers) || '|' || item.modifier_total
    from public.orders as order_header
    join public.order_items as item on item.order_id = order_header.id
    where order_header.idempotency_key = '${RACE_IDENTITIES.modifiers}'
  `);
  assert(snapshot === "1|0.00", `checkout observed a mixed modifier graph: ${snapshot}`);
}

async function proveStaffTransitionRace() {
  runSql(createSql(RACE_IDENTITIES.transition, "c4", "Transition Race"));
  const orderId = runSql(`
    select id from public.orders
    where idempotency_key = '${RACE_IDENTITIES.transition}'
  `);
  const appA = "olh-race-transition-a";
  const appB = "olh-race-transition-b";

  await withSessions([appA, appB], async (sessionA, sessionB) => {
    for (const session of [sessionA, sessionB]) {
      await session.run("begin");
      await session.run(`set local "request.jwt.claim.sub" = '${STAFF_USER_ID}'`);
      await session.run("set local role authenticated");
    }
    await sessionA.run(`
      select public.transition_order_status_v1('${orderId}', 'new', 0, 'preparing')
    `);
    const loser = sessionB.run(`
      do $race$
      begin
        perform public.transition_order_status_v1('${orderId}', 'new', 0, 'cancelled');
        raise exception using errcode = 'P0001', message = 'OLH_RACE_EXPECTED_CONFLICT_MISSING';
      exception when sqlstate 'P0001' then
        if sqlerrm <> 'OLH_TRANSITION_CONFLICT' then
          raise;
        end if;
      end
      $race$
    `);
    await waitForDatabaseLock(appB);
    await sessionA.run("commit");
    await loser;
    await sessionB.run("commit");
  });

  const persisted = runSql(`
    select order_header.status || '|' || order_header.status_version || '|' || count(event.id)
    from public.orders as order_header
    join public.order_status_events as event on event.order_id = order_header.id
    where order_header.id = '${orderId}'
    group by order_header.status, order_header.status_version
  `);
  assert(
    persisted === "preparing|1|2",
    `staff race persisted a contradictory lifecycle: ${persisted}`
  );
}

async function main() {
  assertLocalTarget();
  cleanupFixtures();
  runSql(`
    insert into auth.users (id, aud, role, email)
    values ('${STAFF_USER_ID}', 'authenticated', 'authenticated', 'u3-race@example.invalid');
    insert into public.admin_users (user_id) values ('${STAFF_USER_ID}')
  `);

  try {
    await proveIdenticalCreateRace();
    await provePriceCheckoutRace();
    await proveModifierGraphCheckoutRace();
    await proveStaffTransitionRace();
    console.log(
      JSON.stringify({
        target: "local",
        barriers: "pg_stat_activity.wait_event_type=Lock",
        scenarios: [
          "identical-create",
          "menu-price-checkout",
          "modifier-graph-checkout",
          "staff-advance-cancel",
        ],
      })
    );
  } finally {
    cleanupFixtures();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "U3 race proof failed");
  process.exitCode = 1;
});
