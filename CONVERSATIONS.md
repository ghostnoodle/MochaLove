# Conversations System Guide

## Overview

The conversations system is now fully set up with:

- ✅ Database tables (`conversations` and `messages`)
- ✅ TypeScript types
- ✅ Service functions
- ✅ Real-time subscriptions
- ✅ Automatic metadata updates

## Database Setup

Run the SQL schema in your Supabase SQL Editor:

```bash
# Copy and paste the contents of supabase-schema.sql into your Supabase SQL Editor
```

## Usage in Your App

### 1. Import the services

```typescript
import { conversationService, messageService } from "~/lib/conversations";
import { useAuth } from "~/hooks/useAuth";
```

### 2. Get or Create a Conversation

```typescript
const { user } = useAuth();
const otherUserId = "other-user-uuid";

// Get or create conversation between current user and another user
const conversationId = await conversationService.getOrCreate(user.id, otherUserId);
```

### 3. Fetch User's Conversations

```typescript
const conversations = await conversationService.getUserConversations(user.id);

// Get unread count for each conversation
conversations.forEach((conv) => {
  const unreadCount = conversationService.getUnreadCount(conv, user.id);
  const otherUserId = conversationService.getOtherUserId(conv, user.id);
  console.log(`Conversation with ${otherUserId}: ${unreadCount} unread`);
});
```

### 4. Send a Message

```typescript
const message = await messageService.send({
  conversationId: conversationId,
  fromUserId: user.id,
  toUserId: otherUserId,
  content: "Hey! How are you? ☕",
});

// The conversation metadata is automatically updated via database trigger
```

### 5. Get Messages in a Conversation

```typescript
const messages = await messageService.getByConversationId(conversationId);

// Messages are returned in chronological order (oldest first)
```

### 6. Mark Conversation as Read

```typescript
// When user opens a conversation, mark it as read
await conversationService.markAsRead(conversationId, user.id);
```

### 7. Real-time Updates

```typescript
// Subscribe to conversation updates
const conversationSub = conversationService.subscribeToConversations(user.id, (payload) => {
  console.log("Conversation updated:", payload);
  // Refresh your conversations list
});

// Subscribe to new messages in a specific conversation
const messageSub = messageService.subscribeToMessages(conversationId, (payload) => {
  console.log("New message:", payload.new);
  // Add the new message to your UI
});

// Clean up subscriptions when component unmounts
return () => {
  conversationSub.unsubscribe();
  messageSub.unsubscribe();
};
```

## Example: Updating Messages Screen

Here's how to update your messages screen to use real data:

```typescript
// app/(tabs)/messages.tsx
import * as React from "react";
import { useAuth } from "~/hooks/useAuth";
import { conversationService } from "~/lib/conversations";
import { userService } from "~/lib/auth";
import type { Conversation } from "~/types";

export default function MessagesScreen() {
  const { user } = useAuth();
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch conversations
  React.useEffect(() => {
    if (!user?.id) return;

    const loadConversations = async () => {
      try {
        const data = await conversationService.getUserConversations(user.id);
        setConversations(data);
      } catch (error) {
        console.error("Error loading conversations:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversations();

    // Subscribe to updates
    const subscription = conversationService.subscribeToConversations(
      user.id,
      () => {
        loadConversations(); // Refresh on any change
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id]);

  // Render conversations
  return (
    <SafeAreaView className="flex-1 bg-background">
      {conversations.map((conv) => {
        const otherUserId = conversationService.getOtherUserId(conv, user.id);
        const unreadCount = conversationService.getUnreadCount(conv, user.id);

        return (
          <ConversationItem
            key={conv.id}
            conversationId={conv.id}
            otherUserId={otherUserId}
            lastMessage={conv.last_message}
            timestamp={conv.last_message_at}
            unread={unreadCount > 0}
          />
        );
      })}
    </SafeAreaView>
  );
}
```

## Example: Creating a Chat Screen

```typescript
// app/(tabs)/chat/[id].tsx
import * as React from "react";
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "~/hooks/useAuth";
import { messageService } from "~/lib/conversations";

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = React.useState([]);
  const [newMessage, setNewMessage] = React.useState("");

  // Load messages
  React.useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      const data = await messageService.getByConversationId(conversationId);
      setMessages(data);
    };

    loadMessages();

    // Subscribe to new messages
    const subscription = messageService.subscribeToMessages(conversationId, (payload) => {
      setMessages((prev) => [...prev, payload.new]);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [conversationId]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim()) return;

    await messageService.send({
      conversationId,
      fromUserId: user.id,
      toUserId: otherUserId, // Get from conversation
      content: newMessage,
    });

    setNewMessage("");
  };

  // Render chat UI
}
```

## Features Included

### Automatic Updates

- ✅ Last message automatically updated when new message sent
- ✅ Unread counts automatically incremented
- ✅ Timestamps automatically updated
- ✅ Conversation sorted by latest message

### Helper Functions

- ✅ `getOtherUserId()` - Get the other person in the conversation
- ✅ `getUnreadCount()` - Get unread count for current user
- ✅ `markAsRead()` - Reset unread count and mark messages read

### Real-time Features

- ✅ Subscribe to conversation updates
- ✅ Subscribe to new messages
- ✅ Automatic UI updates via Supabase Realtime

## Next Steps

1. **Run the SQL schema** in Supabase SQL Editor
2. **Update Messages screen** to use real conversations
3. **Create Chat screen** for individual conversations
4. **Add message sending** functionality
5. **Implement photo messages** with unlock feature
6. **Add typing indicators** (optional)

## Cost Per Message

Remember your coin system:

- Men pay 10 coins per message sent
- Women earn $0.05 (5 cents) per message received

You'll need to implement the payment logic when sending messages:

```typescript
// Before sending message, deduct coins from man
if (senderGender === "man") {
  await userService.updateProfile(senderId, {
    coins: currentCoins - 10,
  });

  // Create transaction record
  await supabase.from("transactions").insert({
    user_id: senderId,
    type: "message_sent",
    amount: -10,
    description: "Message sent",
  });
}

// Add earnings to woman
if (receiverGender === "woman") {
  await userService.updateProfile(receiverId, {
    earnings: currentEarnings + 5, // 5 cents
  });

  // Create transaction record
  await supabase.from("transactions").insert({
    user_id: receiverId,
    type: "message_received",
    amount: 5,
    description: "Message received",
  });
}
```
