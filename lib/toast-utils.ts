import { toast } from 'sonner'

export const showSuccess = (message: string, description?: string) => {
  toast.success(message, {
    description,
    duration: 3000,
  })
}

export const showError = (message: string, description?: string) => {
  toast.error(message, {
    description,
    duration: 4000,
  })
}

export const showInfo = (message: string, description?: string) => {
  toast.info(message, {
    description,
    duration: 3000,
  })
}

export const showWarning = (message: string, description?: string) => {
  toast.warning(message, {
    description,
    duration: 3000,
  })
}

export const showLoading = (message: string) => {
  return toast.loading(message)
}

export const dismissToast = (toastId: string | number) => {
  toast.dismiss(toastId)
}

export const thanhCong = (message: string, description?: string) => showSuccess(message, description)
export const thatBai = (message: string, description?: string) => showError(message, description)
export const canh = (message: string, description?: string) => showWarning(message, description)
export const thongTin = (message: string, description?: string) => showInfo(message, description)
