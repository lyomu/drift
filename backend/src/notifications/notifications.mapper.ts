export function toNotificationDto(notification: {
  id: string;
  category: string;
  title: string;
  body: string;
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  readAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: notification.id,
    category: notification.category,
    title: notification.title,
    body: notification.body,
    relatedEntityType: notification.relatedEntityType,
    relatedEntityId: notification.relatedEntityId,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}

export function toPreferencesDto(preference: {
  connections: boolean;
  matches: boolean;
  messages: boolean;
  competitions: boolean;
  learning: boolean;
  news: boolean;
  clubs: boolean;
}) {
  return {
    connections: preference.connections,
    matches: preference.matches,
    messages: preference.messages,
    competitions: preference.competitions,
    learning: preference.learning,
    news: preference.news,
    clubs: preference.clubs,
  };
}
