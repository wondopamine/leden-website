"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ChevronDown } from "lucide-react";

export function DropdownMenuDemo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="default" />}
      >
        Order actions
        <ChevronDown aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Manage order</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>View details</DropdownMenuItem>
          <DropdownMenuItem>Print receipt</DropdownMenuItem>
          <DropdownMenuItem disabled>Refund unavailable</DropdownMenuItem>
          <DropdownMenuItem variant="destructive">Cancel order</DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function DropdownSelectionDemo() {
  const [showUnavailable, setShowUnavailable] = useState(true);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="default" />}
      >
        Menu display
        <ChevronDown aria-hidden className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Display options</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={showUnavailable}
            onCheckedChange={setShowUnavailable}
          >
            Show sold-out items
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function TabsDemo() {
  return (
    <Tabs defaultValue="active" className="max-w-lg">
      <TabsList>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="ready">Ready</TabsTrigger>
        <TabsTrigger value="complete">Complete</TabsTrigger>
      </TabsList>
      <TabsContent value="active" className="mt-4 text-muted-foreground">
        Orders waiting for the café team.
      </TabsContent>
      <TabsContent value="ready" className="mt-4 text-muted-foreground">
        Orders ready for pickup.
      </TabsContent>
      <TabsContent value="complete" className="mt-4 text-muted-foreground">
        Orders already collected.
      </TabsContent>
    </Tabs>
  );
}

export function LineTabsDemo() {
  return (
    <Tabs defaultValue="menu" className="max-w-lg">
      <TabsList variant="line">
        <TabsTrigger value="menu">Menu</TabsTrigger>
        <TabsTrigger value="hours">Hours</TabsTrigger>
        <TabsTrigger value="settings" disabled>Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="menu" className="mt-4 text-muted-foreground">
        Menu editing is available.
      </TabsContent>
      <TabsContent value="hours" className="mt-4 text-muted-foreground">
        Opening hours are available.
      </TabsContent>
      <TabsContent value="settings" className="mt-4 text-muted-foreground">
        Settings are unavailable in this demo.
      </TabsContent>
    </Tabs>
  );
}
