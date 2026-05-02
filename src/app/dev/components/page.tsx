// src/app/dev/components/page.tsx
//
// Dev-only component gallery. Per RESEARCH.md Pattern 4 + Pitfall 3:
//   - This is a SERVER component (no client directive).
//   - The NODE_ENV check sits at module top of the default export.
//   - notFound() short-circuits SSR before any HTML ships in production.
// Acceptance per SPEC.md REQ 4: visiting /dev/components in `next dev` renders
// every component in >= 2 variant or size states with copy-paste code blocks.
//
// Note on Icon: lucide-react icons (LucideIcon) are React components (functions)
// and cannot cross the RSC serialization boundary as the `as` prop. Icon demos
// are wrapped in a thin client-boundary file (icon-demos.tsx) in the same directory.

import type * as React from "react";

import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Stars } from "@/components/ui/stars";
import { FadeIn } from "@/components/fade-in";

import {
  ButtonIconSizesDemo,
  IconIntentsDemo,
  IconSizesDemo,
} from "./icon-demos";

export default function DevComponentsGalleryPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="border-b border-border pb-8">
        <h1 className="text-h1">Component Gallery</h1>
        <p className="mt-2 text-body text-muted-foreground">
          Dev-only — not shipped to production. Every example uses explicit
          <code className="text-caption"> variant </code> and
          <code className="text-caption"> size </code> props per D-08.
        </p>
      </header>

      <Section title="Button">
        <ComponentExample
          title="Variants (size=default)"
          code={`<Button variant="default" size="default">Default</Button>
<Button variant="outline" size="default">Outline</Button>
<Button variant="secondary" size="default">Secondary</Button>
<Button variant="ghost" size="default">Ghost</Button>
<Button variant="destructive" size="default">Destructive</Button>
<Button variant="link" size="default">Link</Button>`}
        >
          <div className="flex flex-wrap gap-3">
            <Button variant="default" size="default">Default</Button>
            <Button variant="outline" size="default">Outline</Button>
            <Button variant="secondary" size="default">Secondary</Button>
            <Button variant="ghost" size="default">Ghost</Button>
            <Button variant="destructive" size="default">Destructive</Button>
            <Button variant="link" size="default">Link</Button>
          </div>
        </ComponentExample>

        <ComponentExample
          title="Sizes (variant=default)"
          code={`<Button variant="default" size="xs">XS</Button>
<Button variant="default" size="sm">SM</Button>
<Button variant="default" size="default">Default</Button>
<Button variant="default" size="lg">LG</Button>`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="default" size="xs">XS</Button>
            <Button variant="default" size="sm">SM</Button>
            <Button variant="default" size="default">Default</Button>
            <Button variant="default" size="lg">LG</Button>
          </div>
        </ComponentExample>

        <ComponentExample
          title="Icon sizes (variant=ghost) — rendered via ButtonIconSizesDemo client wrapper"
          code={`<Button variant="ghost" size="icon-xs"><Icon as={Settings} size="sm" /></Button>
<Button variant="ghost" size="icon-sm"><Icon as={Settings} size="sm" /></Button>
<Button variant="ghost" size="icon"><Icon as={Settings} size="md" /></Button>
<Button variant="ghost" size="icon-lg"><Icon as={Settings} size="lg" /></Button>`}
        >
          <ButtonIconSizesDemo />
        </ComponentExample>
      </Section>

      <Section title="Card">
        <ComponentExample
          title="Default size"
          code={`<Card>
  <CardHeader>
    <CardTitle>Token-driven card</CardTitle>
    <CardDescription>Uses bg-card, text-card-foreground from globals.css.</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-body">Body content sits inside the card surface.</p>
  </CardContent>
  <CardFooter>
    <Button variant="outline" size="sm">Action</Button>
  </CardFooter>
</Card>`}
        >
          <Card>
            <CardHeader>
              <CardTitle>Token-driven card</CardTitle>
              <CardDescription>Uses bg-card, text-card-foreground from globals.css.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-body">Body content sits inside the card surface.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">Action</Button>
            </CardFooter>
          </Card>
        </ComponentExample>

        <ComponentExample
          title="Compact size (size=sm)"
          code={`<Card size="sm">
  <CardHeader>
    <CardTitle>Compact card</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-caption">Tighter padding for dense lists.</p>
  </CardContent>
</Card>`}
        >
          <Card size="sm">
            <CardHeader>
              <CardTitle>Compact card</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-caption">Tighter padding for dense lists.</p>
            </CardContent>
          </Card>
        </ComponentExample>
      </Section>

      <Section title="Input">
        <ComponentExample
          title="Empty placeholder"
          code={`<Input placeholder="Email address" />`}
        >
          <Input placeholder="Email address" />
        </ComponentExample>

        <ComponentExample
          title="With default value"
          code={`<Input defaultValue="hello@cafeleden.com" />`}
        >
          <Input defaultValue="hello@cafeleden.com" />
        </ComponentExample>
      </Section>

      <Section title="Select">
        <ComponentExample
          title="Default trigger (size=default)"
          code={`<Select>
  <SelectTrigger className="w-48">
    <SelectValue placeholder="Pick one" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="a">Option A</SelectItem>
    <SelectItem value="b">Option B</SelectItem>
  </SelectContent>
</Select>`}
        >
          <Select>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Pick one" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="a">Option A</SelectItem>
              <SelectItem value="b">Option B</SelectItem>
            </SelectContent>
          </Select>
        </ComponentExample>

        <ComponentExample
          title="Compact trigger (size=sm)"
          code={`<Select>
  <SelectTrigger size="sm" className="w-40">
    <SelectValue placeholder="Compact" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="x">Option X</SelectItem>
    <SelectItem value="y">Option Y</SelectItem>
  </SelectContent>
</Select>`}
        >
          <Select>
            <SelectTrigger size="sm" className="w-40">
              <SelectValue placeholder="Compact" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="x">Option X</SelectItem>
              <SelectItem value="y">Option Y</SelectItem>
            </SelectContent>
          </Select>
        </ComponentExample>
      </Section>

      <Section title="Badge">
        <ComponentExample
          title="All variants"
          code={`<Badge variant="default">Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Destructive</Badge>
<Badge variant="outline">Outline</Badge>
<Badge variant="ghost">Ghost</Badge>
<Badge variant="link">Link</Badge>`}
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="ghost">Ghost</Badge>
            <Badge variant="link">Link</Badge>
          </div>
        </ComponentExample>

        <ComponentExample
          title="Contextual labels (variant=secondary and outline)"
          code={`<Badge variant="secondary">New</Badge>
<Badge variant="outline">Seasonal</Badge>
<Badge variant="destructive">Sold out</Badge>`}
        >
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">New</Badge>
            <Badge variant="outline">Seasonal</Badge>
            <Badge variant="destructive">Sold out</Badge>
          </div>
        </ComponentExample>
      </Section>

      <Section title="Stars">
        <ComponentExample
          title="All sizes (count=4)"
          code={`<Stars count={4} max={5} size="sm" />
<Stars count={4} max={5} size="md" />
<Stars count={4} max={5} size="lg" />`}
        >
          <div className="flex flex-wrap items-center gap-4">
            <Stars count={4} max={5} size="sm" />
            <Stars count={4} max={5} size="md" />
            <Stars count={4} max={5} size="lg" />
          </div>
        </ComponentExample>

        <ComponentExample
          title="Count variations (size=md)"
          code={`<Stars count={1} max={5} size="md" />
<Stars count={3} max={5} size="md" />
<Stars count={5} max={5} size="md" />`}
        >
          <div className="flex flex-wrap items-center gap-4">
            <Stars count={1} max={5} size="md" />
            <Stars count={3} max={5} size="md" />
            <Stars count={5} max={5} size="md" />
          </div>
        </ComponentExample>
      </Section>

      <Section title="Icon">
        <ComponentExample
          title="All sizes (intent=default)"
          code={`<Icon as={Coffee} size="sm" intent="default" />
<Icon as={Coffee} size="md" intent="default" />
<Icon as={Coffee} size="lg" intent="default" />`}
        >
          <IconSizesDemo />
        </ComponentExample>

        <ComponentExample
          title="All intents (size=md)"
          code={`<Icon as={Star} size="md" intent="default" />
<Icon as={Star} size="md" intent="muted" />
<Icon as={Star} size="md" intent="brand" />`}
        >
          <IconIntentsDemo />
        </ComponentExample>
      </Section>

      <Section title="FadeIn">
        <ComponentExample
          title="direction=up (delay=0)"
          code={`<FadeIn direction="up">
  <Card><CardContent>Fades in from below.</CardContent></Card>
</FadeIn>`}
        >
          <FadeIn direction="up">
            <Card>
              <CardContent>Fades in from below — durations from globals.css motion tokens.</CardContent>
            </Card>
          </FadeIn>
        </ComponentExample>

        <ComponentExample
          title="direction=left (delay=200)"
          code={`<FadeIn direction="left" delay={200}>
  <Card><CardContent>Fades in from the left.</CardContent></Card>
</FadeIn>`}
        >
          <FadeIn direction="left" delay={200}>
            <Card>
              <CardContent>Fades in from the left with a 200 ms delay.</CardContent>
            </Card>
          </FadeIn>
        </ComponentExample>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="text-h2">{title}</h2>
      <div className="mt-4 space-y-6">{children}</div>
    </section>
  );
}

function ComponentExample({
  title,
  code,
  children,
}: {
  title: string;
  code: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-h3">{title}</h3>
      <div className="mt-4">{children}</div>
      <pre className="mt-4 overflow-x-auto rounded bg-muted p-4 text-caption">
        <code>{code}</code>
      </pre>
    </div>
  );
}
