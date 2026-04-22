import { useState, useRef } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useCreateDocument, useUploadDocument } from '@/hooks/use-documents'
import { Link, Upload, FileText, Loader2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  batches: { id: number; batch_name: string }[]
}

export default function DocumentUploadDialog({ open, onOpenChange, batches }: Props) {
  const { toast } = useToast()
  const createDoc = useCreateDocument()
  const uploadDoc = useUploadDocument()
  const fileRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<'link' | 'upload'>('link')
  const [form, setForm] = useState({
    title: '', description: '', doc_type: 'other', batch_id: 'all', file_url: '',
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const reset = () => {
    setForm({ title: '', description: '', doc_type: 'other', batch_id: 'all', file_url: '' })
    setSelectedFile(null)
    setMode('link')
  }

  const handleFile = (file: File) => setSelectedFile(file)

  const handleSubmit = async () => {
    if (!form.title.trim()) return
    // batch_id 'all' nghĩa là không lọc theo đợt
    const batchIdValue = form.batch_id !== 'all' ? Number(form.batch_id) : undefined
    try {
      if (mode === 'link') {
        await createDoc.mutateAsync({
          title: form.title.trim(),
          description: form.description || undefined,
          doc_type: form.doc_type,
          batch_id: batchIdValue,
          file_url: form.file_url || undefined,
        })
      } else {
        if (!selectedFile) return
        const fd = new FormData()
        fd.append('title', form.title.trim())
        fd.append('doc_type', form.doc_type)
        if (form.description) fd.append('description', form.description)
        if (batchIdValue) fd.append('batch_id', String(batchIdValue))
        fd.append('file', selectedFile)
        await uploadDoc.mutateAsync(fd)
      }
      toast({ title: 'Đã thêm tài liệu!' })
      reset()
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: 'Lỗi', description: err.response?.data?.detail || 'Có lỗi xảy ra' })
    }
  }

  const isPending = createDoc.isPending || uploadDoc.isPending

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Thêm tài liệu training
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Thông tin chung */}
          <div className="space-y-1.5">
            <Label>Tiêu đề <span className="text-red-500">*</span></Label>
            <Input placeholder="VD: Tài liệu onboarding tháng 1" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Loại tài liệu</Label>
              <Select value={form.doc_type} onValueChange={v => setForm(f => ({ ...f, doc_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="slide">Slide</SelectItem>
                  <SelectItem value="link">Link</SelectItem>
                  <SelectItem value="other">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Đợt thực tập</Label>
              <Select value={form.batch_id} onValueChange={v => setForm(f => ({ ...f, batch_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Tất cả đợt" /></SelectTrigger>
                <SelectContent>
                  {/* Dùng "all" thay vì "" để tránh lỗi SelectItem */}
                  <SelectItem value="all">Tất cả đợt</SelectItem>
                  {batches.map(b => (
                    <SelectItem key={b.id} value={String(b.id)}>{b.batch_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Mô tả</Label>
            <Textarea placeholder="Mô tả ngắn về tài liệu..." rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Link hoặc Upload */}
          <Tabs value={mode} onValueChange={v => setMode(v as 'link' | 'upload')}>
            <TabsList className="w-full">
              <TabsTrigger value="link" className="flex-1 gap-1.5">
                <Link className="h-4 w-4" />Link URL
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex-1 gap-1.5">
                <Upload className="h-4 w-4" />Upload file
              </TabsTrigger>
            </TabsList>

            <TabsContent value="link" className="mt-3">
              <Input placeholder="https://drive.google.com/... hoặc URL bất kỳ"
                value={form.file_url}
                onChange={e => setForm(f => ({ ...f, file_url: e.target.value }))} />
            </TabsContent>

            <TabsContent value="upload" className="mt-3">
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => {
                  e.preventDefault(); setDragOver(false)
                  const f = e.dataTransfer.files[0]; if (f) handleFile(f)
                }}
              >
                <input ref={fileRef} type="file" className="hidden"
                  onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-blue-700">
                    <FileText className="h-5 w-5" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({(selectedFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                ) : (
                  <>
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-muted-foreground">Kéo thả hoặc click để chọn file</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, PPTX, DOCX, ZIP...</p>
                  </>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>Hủy</Button>
          <Button
            onClick={handleSubmit}
            disabled={!form.title.trim() || (mode === 'upload' && !selectedFile) || isPending}
            className="bg-blue-800 hover:bg-blue-900"
          >
            {isPending
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Đang lưu...</>
              : 'Thêm tài liệu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}