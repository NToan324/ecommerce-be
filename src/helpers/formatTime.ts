export function expirationOtp(time: number): String {
  const dateNow = new Date()
  const expiration = formatTime(new Date(dateNow.getTime() + time * 60 * 1000))
  return expiration
}

export function formatTime(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }

  return date.toLocaleString('vi-VN', options)
}
