"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatTab } from "./chat-tab"
import { MatchInfoTab } from "./match-info-tab"
import { LineupTab } from "./lineup-tab"

export function MatchTabs() {
  return (
    <Tabs defaultValue="info" className="w-full">
      <TabsList className="w-full grid grid-cols-3 bg-card border-b border-border rounded-none h-12">
        <TabsTrigger
          value="chat"
          className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none text-sm font-medium"
        >
          채팅
        </TabsTrigger>
        <TabsTrigger
          value="info"
          className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none text-sm font-medium"
        >
          경기정보
        </TabsTrigger>
        <TabsTrigger
          value="lineup"
          className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none text-sm font-medium"
        >
          라인업
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="chat" className="mt-0">
        <ChatTab />
      </TabsContent>
      
      <TabsContent value="info" className="mt-0">
        <MatchInfoTab />
      </TabsContent>
      
      <TabsContent value="lineup" className="mt-0">
        <LineupTab />
      </TabsContent>
    </Tabs>
  )
}
