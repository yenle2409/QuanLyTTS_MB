import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useImportExcel } from '@/hooks/use-profiles'
import { useBatches, type Batch } from '@/hooks/use-batches'
import { useToast } from '@/hooks/use-toast'

interface ImportExcelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ImportExcelDialog({ open, onOpenChange }: ImportExcelDialogProps) {
  const { toast } = useToast()
  const importExcel = useImportExcel()
  const { data: batches } = useBatches('open')

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')
  const [importResult, setImportResult] = useState<{
    success: boolean
    message: string
    errors?: string[]
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng chọn file Excel (.xlsx hoặc .xls)',
         
        })
        return
      }
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast({
          title: 'Lỗi',
          description: 'Vui lòng chọn file Excel (.xlsx hoặc .xls)',
          
        })
        return
      }
      setSelectedFile(file)
      setImportResult(null)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn file để import',
       
      })
      return
    }

    if (!selectedBatchId) {
      toast({
        title: 'Lỗi',
        description: 'Vui lòng chọn đợt thực tập',
        
      })
      return
    }

    try {
      const result = await importExcel.mutateAsync({
        file: selectedFile,
        batchId: parseInt(selectedBatchId),
      })

      setImportResult({
        success: true,
        message: result.message,
        errors: result.errors,
      })

      toast({
        title: 'Thành công',
        description: result.message,
      })
    } catch (error: any) {
      setImportResult({
        success: false,
        message: error.response?.data?.detail || 'Có lỗi xảy ra khi import',
      })

      toast({
        title: 'Lỗi',
        description: error.response?.data?.detail || 'Có lỗi xảy ra',
       
      })
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setSelectedBatchId('')
    setImportResult(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Import thực tập sinh từ Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template download */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Định dạng file Excel</h4>
            <p className="text-sm text-blue-700 mb-2">
              File Excel cần có các cột theo thứ tự:
            </p>
            <div className="text-sm text-blue-800 bg-white p-2 rounded font-mono">
              Họ tên | Email | SĐT | Trường | GPA | Phòng ban | Link CV 
            </div>
            
          </div>

          {/* Batch selection */}
          <div className="space-y-2">
            <Label>Đợt thực tập</Label>
            <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn đợt thực tập" />
              </SelectTrigger>
              <SelectContent>
                {batches?.map((batch: Batch) => (
                  <SelectItem key={batch.id} value={batch.id.toString()}>
                    {batch.batch_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File upload area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              selectedFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-primary'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="h-12 w-12 text-green-600" />
                <p className="font-medium text-green-700">{selectedFile.name}</p>
                <p className="text-sm text-green-600">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedFile(null)
                    setImportResult(null)
                  }}
                >
                  Chọn file khác
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-12 w-12 text-gray-400" />
                <p className="font-medium">Kéo thả file Excel vào đây</p>
                <p className="text-sm text-muted-foreground">hoặc click để chọn file</p>
              </div>
            )}
          </div>

          {/* Import result */}
          {importResult && (
            <div
              className={`p-4 rounded-lg ${
                importResult.success ? 'bg-green-50' : 'bg-red-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {importResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span
                  className={`font-medium ${
                    importResult.success ? 'text-green-700' : 'text-red-700'
                  }`}
                >
                  {importResult.message}
                </span>
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-700 mb-1">Các lỗi:</p>
                  <ul className="text-sm text-red-600 list-disc list-inside max-h-32 overflow-y-auto">
                    {importResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              {importResult?.success ? 'Đóng' : 'Hủy'}
            </Button>
            {!importResult?.success && (
              <Button
                onClick={handleImport}
                disabled={!selectedFile || !selectedBatchId || importExcel.isPending}
              >
                {importExcel.isPending ? 'Đang import...' : 'Import'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
