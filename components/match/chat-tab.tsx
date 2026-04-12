"use client"

import { useState } from "react"
import { Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: string
}

const sampleMessages: ChatMessage[] = [
  { id: "1", user: "축구팬123", message: "오늘 경기 기대됩니다!", timestamp: "18:30" },
  { id: "2", user: "풋볼러", message: "홈팀 화이팅~", timestamp: "18:31" },
  { id: "3", user: "스포츠매니아", message: "와 벌써 골이네요", timestamp: "18:35" },
  { id: "4", user: "관중석1열", message: "수비 좀 해라ㅋㅋ", timestamp: "18:38" },
  { id: "5", user: "축구덕후", message: "오프사이드 아니야?", timestamp: "18:40" },
  { id: "6", user: "주말축구", message: "좋은 경기 보여주세요", timestamp: "18:42" },
  { id: "7", user: "골키퍼아빠", message: "우리 아들 오늘 선방 많이 해라", timestamp: "18:43" },
  { id: "8", user: "FC매니아", message: "패스 좋다!", timestamp: "18:45" },
]

export function ChatTab() {
  const [messages, setMessages] = useState<ChatMessage[]>(sampleMessages)
  const [inputValue, setInputValue] = useState("")

  const handleSend = () => {
    if (!inputValue.trim()) return
    
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      user: "나",
      message: inputValue,
      timestamp: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    }
    
    setMessages([...messages, newMessage])
    setInputValue("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-280px)] min-h-[300px]">
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-2 py-3">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-2 items-start">
              <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-foreground">
                  {msg.user.slice(0, 1)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-foreground">{msg.user}</span>
                  <span className="text-[10px] text-muted-foreground">{msg.timestamp}</span>
                </div>
                <p className="text-sm text-foreground/90 break-words">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-secondary border-0 text-foreground placeholder:text-muted-foreground"
          />
          <Button size="icon" onClick={handleSend} className="shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
