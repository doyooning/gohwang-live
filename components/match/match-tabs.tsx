"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatTab } from "./chat-tab"
import { MatchInfoTab } from "./match-info-tab"
import { LineupTab } from "./lineup-tab"

interface MatchTabsProps {
  videoId?: string
  matchId?: string
}

export function MatchTabs({ videoId, matchId }: MatchTabsProps) {
  return (
    <Tabs defaultValue="info" className="w-full h-full flex flex-col">
      <TabsList className="w-full grid grid-cols-3 bg-card border-b border-border rounded-none h-12 shrink-0">
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
      
      <TabsContent value="chat" className="mt-0 flex-1 overflow-hidden">
        <ChatTab videoId={videoId} />
      </TabsContent>
      
      <TabsContent value="info" className="mt-0 flex-1 overflow-hidden">
        <MatchInfoTab matchId={matchId} />
      </TabsContent>
      
      <TabsContent value="lineup" className="mt-0 flex-1 overflow-hidden">
        <LineupTab matchId={matchId} />
      </TabsContent>
    </Tabs>
  )
}
