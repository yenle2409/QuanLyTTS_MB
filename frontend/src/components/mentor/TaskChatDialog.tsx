import { useState, useRef, useEffect } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { Send, Trash2, MessageSquare, RefreshCw } from 'lucide-react'
import { useTaskMessages, useSendTaskMessage, useDeleteTaskMessage, type TaskMessage } from '@/hooks/use-task-messages'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { Task } from '@/hooks/use-tasks'

interface TaskChatDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  currentUserId: number
  currentUserRole: string
}

const roleLabel: Record<string, string> = {
  mentor: 'Mentor',
  intern: 'Thực tập sinh',
  hr: 'HR',
  admin: 'Admin',
}

const roleBadgeClass: Record<string, string> = {
  mentor: 'bg-blue-100 text-blue-800',
  intern: 'bg-green-100 text-green-800',
  hr: 'bg-purple-100 text-purple-800',
  admin: 'bg-red-100 text-red-800',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(-2)
    .join('')
    .toUpperCase()
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Vừa xong'
  if (diffMins < 60) return `${diffMins} phút trước`
  if (diffMins < 1440) return format(date, 'HH:mm', { locale: vi })
  return format(date, 'dd/MM/yyyy HH:mm', { locale: vi })
}

export default function TaskChatDialog({
  open,
  onOpenChange,
  task,
  currentUserId,
  currentUserRole,
}: TaskChatDialogProps) {
  const { toast } = useToast()
  const [inputValue, setInputValue] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: messages = [], isLoading, refetch, isFetching } = useTaskMessages(open ? task?.id ?? null : null)
  const sendMessage = useSendTaskMessage(task?.id ?? 0)
  const deleteMessage = useDeleteTaskMessage(task?.id ?? 0)

  // Cuộn xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // Reset input khi đóng dialog
  useEffect(() => {
    if (!open) setInputValue('')
  }, [open])

  const handleSend = async () => {
    const content = inputValue.trim()
    if (!content || sendMessage.isPending) return

    try {
      await sendMessage.mutateAsync(content)
      setInputValue('')
      textareaRef.current?.focus()
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.response?.data?.detail || 'Không thể gửi tin nhắn',
       
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter hoặc Cmd+Enter để gửi
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const handleDelete = async (messageId: number) => {
    try {
      await deleteMessage.mutateAsync(messageId)
    } catch (error: any) {
      toast({
        title: 'Lỗi',
        description: error.response?.data?.detail || 'Không thể xóa tin nhắn',
       
      })
    }
  }

  if (!task) return null

  const isMyMessage = (msg: TaskMessage) => msg.sender_id === currentUserId

  // Nhóm tin nhắn theo ngày
  const groupedMessages: { date: string; msgs: TaskMessage[] }[] = []
  messages.forEach(msg => {
    const dateKey = format(new Date(msg.created_at), 'dd/MM/yyyy', { locale: vi })
    const last = groupedMessages[groupedMessages.length - 1]
    if (last && last.date === dateKey) {
      last.msgs.push(msg)
    } else {
      groupedMessages.push({ date: dateKey, msgs: [msg] })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[75vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-900 to-blue-700 rounded-t-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-base font-semibold line-clamp-1">
                  {task.title}
                </DialogTitle>
                <p className="text-blue-200 text-xs mt-0.5">
                  Trao đổi với {currentUserRole === 'mentor' ? task.intern_name : task.mentor_name}
                </p>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-white hover:bg-white/20 h-8 w-8 mt-0.5"
                    onClick={() => refetch()}
                    disabled={isFetching}
                  >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Làm mới</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </DialogHeader>

        {/* Messages area */}
        <ScrollArea className="flex-1 px-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full py-16 text-muted-foreground text-sm">
              Đang tải tin nhắn...
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Chưa có tin nhắn nào</p>
              <p className="text-xs mt-1">Hãy bắt đầu cuộc trò chuyện!</p>
            </div>
          ) : (
            <div className="py-4 space-y-1">
              {groupedMessages.map(group => (
                <div key={group.date}>
                  {/* Date separator */}
                  <div className="flex items-center gap-2 my-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full">
                      {group.date === format(new Date(), 'dd/MM/yyyy', { locale: vi }) ? 'Hôm nay' : group.date}
                    </span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Messages in this date group */}
                  {group.msgs.map((msg, idx) => {
                    const isMine = isMyMessage(msg)
                    const prevMsg = group.msgs[idx - 1]
                    const isSameSenderAsPrev = prevMsg && prevMsg.sender_id === msg.sender_id
                    const showAvatar = !isMine && !isSameSenderAsPrev

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'} ${isSameSenderAsPrev ? 'mt-1' : 'mt-3'}`}
                      >
                        {/* Avatar (chỉ hiện khi đổi người gửi) */}
                        {!isMine && (
                          <div className="w-8 flex-shrink-0">
                            {showAvatar && (
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs bg-blue-100 text-blue-800 font-medium">
                                  {getInitials(msg.sender_name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        )}

                        {/* Message bubble */}
                        <div className={`group max-w-[70%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                          {/* Sender name + role (chỉ hiện khi đổi người gửi) */}
                          {!isMine && !isSameSenderAsPrev && (
                            <div className="flex items-center gap-1.5 mb-1 ml-1">
                              <span className="text-xs font-medium text-gray-700">{msg.sender_name}</span>
                              <Badge
                                className={`text-[10px] px-1.5 py-0 h-4 ${roleBadgeClass[msg.sender_role] || 'bg-gray-100 text-gray-600'}`}
                              >
                                {roleLabel[msg.sender_role] || msg.sender_role}
                              </Badge>
                            </div>
                          )}

                          <div className={`flex items-end gap-1 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                            {/* Bubble */}
                            <div
                              className={`
                                px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words
                                ${isMine
                                  ? 'bg-blue-800 text-white rounded-br-sm'
                                  : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                                }
                              `}
                            >
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>

                            {/* Delete button (chỉ hiện khi hover, chỉ tin của mình) */}
                            {isMine && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => handleDelete(msg.id)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 p-1 rounded"
                                      disabled={deleteMessage.isPending}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Xóa tin nhắn</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>

                          {/* Timestamp */}
                          <span className={`text-[10px] text-muted-foreground mt-0.5 ${isMine ? 'mr-1' : 'ml-1'}`}>
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input area */}
        <div className="px-4 py-3 border-t bg-gray-50 rounded-b-lg">
          <div className="flex gap-2 items-end">
            <Textarea
              ref={textareaRef}
              placeholder="Nhập tin nhắn... (Ctrl+Enter để gửi)"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 min-h-[44px] max-h-[120px] resize-none bg-white text-sm"
              rows={1}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || sendMessage.isPending}
              className="bg-blue-800 hover:bg-blue-900 h-11 px-4 flex-shrink-0"
            >
              {sendMessage.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 ml-0.5">
            Tin nhắn tự làm mới mỗi 5 giây · Ctrl+Enter để gửi nhanh
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}