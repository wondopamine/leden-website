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

import type { Metadata } from "next";
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
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenuDemo,
  DropdownSelectionDemo,
  LineTabsDemo,
  TabsDemo,
} from "./interactive-demos";

export const metadata: Metadata = {
  title: "Component gallery | Café Le Den",
  description: "Development reference for Café Le Den interface components.",
};

export default function DevComponentsGalleryPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <>
      <a
        href="#component-gallery"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-3 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to component gallery
      </a>
      <main id="component-gallery" className="mx-auto w-full min-w-0 max-w-5xl overflow-x-clip px-4 py-12">
      <header className="border-b border-border pb-8">
        <h1 className="text-h1">Component gallery</h1>
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
          code={`<Label htmlFor="email">Email address</Label>
<Input id="email" placeholder="name@example.com" />`}
        >
          <div className="space-y-2">
            <Label htmlFor="gallery-email">Email address</Label>
            <Input id="gallery-email" placeholder="name@example.com" />
          </div>
        </ComponentExample>

        <ComponentExample
          title="With default value"
          code={`<Label htmlFor="contact-email">Contact email</Label>
<Input id="contact-email" defaultValue="hello@cafeleden.com" />`}
        >
          <div className="space-y-2">
            <Label htmlFor="gallery-contact-email">Contact email</Label>
            <Input id="gallery-contact-email" defaultValue="hello@cafeleden.com" />
          </div>
        </ComponentExample>
      </Section>

      <Section title="Select">
        <ComponentExample
          title="Default trigger (size=default)"
          code={`<Label htmlFor="default-option">Default option</Label>
<Select>
  <SelectTrigger id="default-option" className="w-48">
    <SelectValue placeholder="Pick one" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="a">Option A</SelectItem>
    <SelectItem value="b">Option B</SelectItem>
  </SelectContent>
</Select>`}
        >
          <div className="space-y-2">
            <Label htmlFor="gallery-default-option">Default option</Label>
            <Select>
              <SelectTrigger id="gallery-default-option" className="w-48">
                <SelectValue placeholder="Pick one" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">Option A</SelectItem>
                <SelectItem value="b">Option B</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </ComponentExample>

        <ComponentExample
          title="Compact trigger (size=sm)"
          code={`<Label htmlFor="compact-option">Compact option</Label>
<Select>
  <SelectTrigger id="compact-option" size="sm" className="w-40">
    <SelectValue placeholder="Compact" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="x">Option X</SelectItem>
    <SelectItem value="y">Option Y</SelectItem>
  </SelectContent>
</Select>`}
        >
          <div className="space-y-2">
            <Label htmlFor="gallery-compact-option">Compact option</Label>
            <Select>
              <SelectTrigger id="gallery-compact-option" size="sm" className="w-40">
                <SelectValue placeholder="Compact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="x">Option X</SelectItem>
                <SelectItem value="y">Option Y</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
<Stars count={5} max={5} size="md" label="5 out of 5 stars" />`}
        >
          <div className="flex flex-wrap items-center gap-4">
            <Stars count={1} max={5} size="md" />
            <Stars count={3} max={5} size="md" />
            <Stars count={5} max={5} size="md" label="5 out of 5 stars" />
          </div>
        </ComponentExample>
      </Section>

      <Section title="Dropdown menu">
        <ComponentExample
          title="Action menu"
          code={`<DropdownMenu>
  <DropdownMenuTrigger render={<Button variant="outline" />}>Order actions</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>View details</DropdownMenuItem>
    <DropdownMenuItem variant="destructive">Cancel order</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>`}
        >
          <DropdownMenuDemo />
        </ComponentExample>
        <ComponentExample
          title="Selection menu"
          code={`<DropdownMenuCheckboxItem checked={showUnavailable}>
  Show sold-out items
</DropdownMenuCheckboxItem>`}
        >
          <DropdownSelectionDemo />
        </ComponentExample>
      </Section>

      <Section title="Tabs">
        <ComponentExample
          title="Operational filter"
          code={`<Tabs defaultValue="active">
  <TabsList>
    <TabsTrigger value="active">Active</TabsTrigger>
    <TabsTrigger value="ready">Ready</TabsTrigger>
    <TabsTrigger value="complete">Complete</TabsTrigger>
  </TabsList>
  <TabsContent value="active">Orders waiting for the café team.</TabsContent>
</Tabs>`}
        >
          <TabsDemo />
        </ComponentExample>
        <ComponentExample
          title="Line tabs with disabled state"
          code={`<TabsList variant="line">
  <TabsTrigger value="menu">Menu</TabsTrigger>
  <TabsTrigger value="hours">Hours</TabsTrigger>
  <TabsTrigger value="settings" disabled>Settings</TabsTrigger>
</TabsList>`}
        >
          <LineTabsDemo />
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
      </main>
    </>
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
    <section className="mt-12 min-w-0 scroll-mt-6">
      <h2 className="text-h2">{title}</h2>
      <div className="mt-4 min-w-0 space-y-8">{children}</div>
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
    <div className="min-w-0 border-t border-border pt-6">
      <h3 className="text-h3">{title}</h3>
      <div className="mt-4">{children}</div>
      <pre className="mt-4 max-w-full overflow-x-auto rounded-lg bg-muted p-4 text-caption">
        <code>{code}</code>
      </pre>
    </div>
  );
}
