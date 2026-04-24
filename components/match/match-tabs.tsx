"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatTab } from "./chat-tab";
import { MatchInfoTab } from "./match-info-tab";
import { LineupTab } from "./lineup-tab";

interface MatchTabsProps {
  videoId?: string;
  matchId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
}

export function MatchTabs({
  videoId,
  matchId,
  homeTeamName,
  awayTeamName,
}: MatchTabsProps) {
  const [activeTab, setActiveTab] = useState("info");

  return (
    <Tabs
      value={activeTab}
      onValueChange={setActiveTab}
      className="w-full h-full flex flex-col"
    >
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
          타임라인
        </TabsTrigger>
        <TabsTrigger
          value="lineup"
          className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground rounded-none text-sm font-medium"
        >
          라인업
        </TabsTrigger>
      </TabsList>

      <TabsContent value="chat" className="mt-0 flex-1 overflow-hidden">
        {activeTab === "chat" && <ChatTab videoId={videoId} />}
      </TabsContent>

      <TabsContent value="info" className="mt-0 flex-1 overflow-hidden">
        {activeTab === "info" && (
          <MatchInfoTab
            matchId={matchId}
            homeTeamName={homeTeamName}
            awayTeamName={awayTeamName}
          />
        )}
      </TabsContent>

      <TabsContent value="lineup" className="mt-0 flex-1 overflow-hidden">
        {activeTab === "lineup" && <LineupTab matchId={matchId} />}
      </TabsContent>
    </Tabs>
  );
}
