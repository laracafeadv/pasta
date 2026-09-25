export type NotificationKind = 'info' | 'success' | 'warning' | 'error';

export interface NotificationDTO {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationKind;
  is_read: boolean;
  metadata: Record<string, any>;
  created_at: string;
}

export type CreateNotificationDTO = Omit<NotificationDTO, 'id' | 'created_at'>;
export type UpdateNotificationDTO = Partial<Omit<NotificationDTO, 'id' | 'user_id' | 'created_at'>>;
