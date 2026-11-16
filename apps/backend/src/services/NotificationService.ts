import { supabaseAdmin } from '../lib/supabase.js';
import type { Notification } from '@bingo/shared-types';

export class NotificationService {
  /**
   * Create a new notification for a user
   */
  static async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<Notification> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        metadata,
      })
      .select()
      .single();

    if (error) throw error;
    return data as Notification;
  }

  /**
   * Create notifications for all admins
   */
  static async notifyAllAdmins(
    type: Notification['type'],
    title: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    // Get all admin user IDs
    const { data: admins, error: adminError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (adminError) throw adminError;

    if (!admins || admins.length === 0) return;

    // Create notification for each admin
    const notifications = admins.map((admin: { id: string }) => ({
      user_id: admin.id,
      type,
      title,
      message,
      metadata,
    }));

    const { error } = await supabaseAdmin.from('notifications').insert(notifications);

    if (error) throw error;
  }

  /**
   * Get user's notifications (latest first, with pagination)
   */
  static async getUserNotifications(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Notification[]> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as Notification[];
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) throw error;
  }

  /**
   * Mark all user's notifications as read
   */
  static async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
  }

  /**
   * Get count of unread notifications for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return count || 0;
  }

  /**
   * Delete old read notifications (cleanup - optional)
   */
  static async deleteOldNotifications(daysOld: number = 30): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { error } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('read', true)
      .lt('created_at', cutoffDate.toISOString());

    if (error) throw error;
  }
}
