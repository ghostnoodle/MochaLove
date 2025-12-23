# Enhanced Messaging Features - Implementation Guide

## Overview

The messaging system has been enhanced with the following features:

1. **Read Receipts** - Track when messages are read
2. **Message Reactions** - Allow users to react to messages with emojis
3. **Typing Indicators** - Show when someone is typing
4. **Voice Messages** - Support for audio messages (infrastructure ready)
5. **Photo/GIF Support** - Enhanced photo messaging

## What's Been Implemented

### 1. Database Schema ✅

**File:** `/supabase-messaging-enhancements.sql`

Run this SQL in your Supabase SQL Editor to add:

- `read_at` timestamp column to messages table
- `audio_url` and `audio_duration_seconds` columns for voice messages
- `message_reactions` table for emoji reactions
- `typing_indicators` table for real-time typing status
- Database functions for managing typing indicators
- Indexes for performance
- Row Level Security (RLS) policies

**To Apply:**

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the contents of `supabase-messaging-enhancements.sql`
4. Paste and run the SQL

### 2. TypeScript Types ✅

**File:** `/types/index.ts`

Added types for:

- `read_at` field in Message interface
- `audio_url` and `audio_duration_seconds` in Message interface
- `ReactionType` - Union type for reaction emojis
- `MessageReaction` interface
- `TypingIndicator` interface

### 3. Service Functions ✅

**File:** `/lib/conversations.ts`

Added three new service modules:

#### Message Service Extensions

- `sendVoiceMessage()` - Send audio messages

#### Reaction Service (NEW)

- `addReaction()` - Add/update a reaction to a message
- `removeReaction()` - Remove a reaction
- `getReactionsForMessage()` - Get reactions for a single message
- `getReactionsForMessages()` - Get reactions for multiple messages
- `subscribeToReactions()` - Real-time reaction updates

#### Typing Service (NEW)

- `setTyping()` - Mark user as typing
- `removeTyping()` - Remove typing indicator
- `getTyping()` - Get current typing users
- `subscribeToTyping()` - Real-time typing updates

### 4. Icons ✅

**Files:** Created in `/lib/icons/`

- `SmilePlus.tsx` - Reaction picker button
- `Image.tsx` - Photo/image messages
- `Mic.tsx` - Voice message recording
- `Play.tsx` - Play voice messages
- `Pause.tsx` - Pause voice messages
- `CheckCheck.tsx` - Double check for read receipts

All icons registered in `/app/_layout.tsx`

## UI Implementation - Next Steps

The infrastructure is ready! Here's how to implement the UI features:

### Read Receipts

In `renderMessage()` function:

```typescript
// Add at the end of the message bubble
{item.isFromMe && (
  <View className="flex-row items-center ml-2">
    {item.read_at ? (
      <CheckCheck className="h-4 w-4 text-primary" />
    ) : (
      <Check className="h-4 w-4 text-muted-foreground" />
    )}
  </View>
)}
```

### Typing Indicator

Add subscription in `useEffect`:

```typescript
// Subscribe to typing indicators
const typingSubscription = typingService.subscribeToTyping(conversationId, async () => {
  const indicators = await typingService.getTyping(conversationId);
  const otherUserIsTyping = indicators.some((ind) => ind.user_id === otherUser?.id);
  setIsOtherUserTyping(otherUserIsTyping);
});
```

Handle typing in TextInput:

```typescript
<TextInput
  value={messageText}
  onChangeText={(text) => {
    setMessageText(text);

    // Update typing indicator
    if (text.trim() && conversationId && user?.id) {
      typingService.setTyping(conversationId, user.id);

      // Clear timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Remove typing indicator after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        typingService.removeTyping(conversationId, user.id);
      }, 3000);
    }
  }}
  onEndEditing={() => {
    if (conversationId && user?.id) {
      typingService.removeTyping(conversationId, user.id);
    }
  }}
/>
```

Show typing indicator:

```typescript
{isOtherUserTyping && (
  <View className="px-6 py-2">
    <Text className="text-sm text-muted-foreground italic">
      {otherUser?.name} is typing...
    </Text>
  </View>
)}
```

### Message Reactions

Add long-press handler to message:

```typescript
<TouchableOpacity
  onLongPress={() => setSelectedMessageForReaction(item.id)}
  activeOpacity={0.7}
>
  {/* Message content */}
</TouchableOpacity>
```

Display reactions under message:

```typescript
{item.reactions && item.reactions.length > 0 && (
  <View className="flex-row flex-wrap gap-1 mt-1">
    {/* Group reactions by type */}
    {Object.entries(
      item.reactions.reduce((acc, r) => {
        acc[r.reaction] = (acc[r.reaction] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([reaction, count]) => (
      <TouchableOpacity
        key={reaction}
        onPress={async () => {
          // Toggle reaction
          const myReaction = item.reactions?.find(
            (r) => r.user_id === user?.id && r.reaction === reaction
          );
          if (myReaction) {
            await reactionService.removeReaction(item.id, user!.id);
          } else {
            await reactionService.addReaction(
              item.id,
              user!.id,
              reaction as ReactionType
            );
          }
        }}
        className="bg-card border border-border rounded-full px-2 py-1"
      >
        <Text className="text-xs">
          {getReactionEmoji(reaction)} {count}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
)}
```

Reaction picker modal:

```typescript
{selectedMessageForReaction && (
  <View className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-4">
    <Text className="text-sm text-muted-foreground mb-3">React to message</Text>
    <View className="flex-row justify-around">
      {(['heart', 'like', 'love', 'laugh', 'wow', 'sad', 'angry'] as ReactionType[]).map(
        (reaction) => (
          <TouchableOpacity
            key={reaction}
            onPress={async () => {
              if (user?.id) {
                await reactionService.addReaction(
                  selectedMessageForReaction,
                  user.id,
                  reaction
                );
                setSelectedMessageForReaction(null);
              }
            }}
            className="p-2"
          >
            <Text className="text-2xl">{getReactionEmoji(reaction)}</Text>
          </TouchableOpacity>
        )
      )}
    </View>
    <TouchableOpacity
      onPress={() => setSelectedMessageForReaction(null)}
      className="mt-3 p-3 bg-muted rounded-xl"
    >
      <Text className="text-center text-foreground">Cancel</Text>
    </TouchableOpacity>
  </View>
)}
```

Helper function:

```typescript
const getReactionEmoji = (reaction: string): string => {
  const emojis = {
    heart: "❤️",
    like: "👍",
    love: "😍",
    laugh: "😂",
    wow: "😮",
    sad: "😢",
    angry: "😠",
  };
  return emojis[reaction as keyof typeof emojis] || "👍";
};
```

### Photo Messages

Add image picker button to input area:

```typescript
import * as ImagePicker from "expo-image-picker";

const pickImage = async () => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    // Upload image to Supabase Storage
    const file = result.assets[0];
    const fileExt = file.uri.split(".").pop();
    const fileName = `${user?.id}-${Date.now()}.${fileExt}`;

    // Upload to storage (you'll need to set up Supabase Storage bucket)
    // Then send message with photo_url
    await messageService.send({
      conversationId,
      fromUserId: user.id,
      toUserId: otherUser.id,
      photoUrl: uploadedUrl,
    });
  }
};
```

Display image messages:

```typescript
{item.photo_url && (
  <Image
    source={{ uri: item.photo_url }}
    className="w-48 h-48 rounded-2xl"
    resizeMode="cover"
  />
)}
```

### Voice Messages

This requires additional packages:

- `expo-av` for audio recording and playback
- Supabase Storage for hosting audio files

Basic implementation:

```typescript
import { Audio } from "expo-av";

const [recording, setRecording] = React.useState<Audio.Recording>();

const startRecording = async () => {
  try {
    await Audio.requestPermissionsAsync();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY,
    );
    setRecording(recording);
  } catch (err) {
    console.error("Failed to start recording", err);
  }
};

const stopRecording = async () => {
  if (!recording) return;

  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();

  // Upload to storage and send as voice message
  // ...

  setRecording(undefined);
};
```

## Subscription Management

Add these subscriptions to load reactions and typing:

```typescript
React.useEffect(() => {
  if (!conversationId) return;

  // Subscribe to reactions
  const reactionSub = reactionService.subscribeToReactions(conversationId, async () => {
    const messageIds = messages.map((m) => m.id);
    const reactionsData = await reactionService.getReactionsForMessages(messageIds);
    setReactions(reactionsData);
  });

  // Subscribe to typing
  const typingSub = typingService.subscribeToTyping(conversationId, async () => {
    const indicators = await typingService.getTyping(conversationId);
    const otherUserIsTyping = indicators.some((ind) => ind.user_id === otherUser?.id);
    setIsOtherUserTyping(otherUserIsTyping);
  });

  return () => {
    reactionSub.unsubscribe();
    typingSub.unsubscribe();
  };
}, [conversationId, messages, otherUser?.id]);
```

## Testing

### Test Read Receipts

1. Send a message from User A to User B
2. User B opens the chat
3. Check that User A sees double checkmark (✓✓)

### Test Reactions

1. Long-press on a message
2. Select a reaction emoji
3. Verify it appears under the message
4. Tap reaction again to remove it

### Test Typing Indicators

1. Open chat as User A
2. Have User B start typing
3. Verify "User B is typing..." appears
4. Indicator should disappear after User B stops typing

### Test Voice Messages

1. Hold mic button to record
2. Release to send
3. Recipient should see play button
4. Tap to play audio

## Performance Considerations

- Reactions are loaded in batches for all visible messages
- Typing indicators auto-expire after 10 seconds
- Use debouncing for typing indicator updates (already implemented with timeout)
- Consider pagination for messages with many reactions

## Security Notes

- All features respect RLS policies
- Users can only react to messages they're part of
- Typing indicators only visible to conversation participants
- Audio/photo uploads should be scoped to user's storage path

## Next Steps

1. Run the SQL migration in Supabase
2. Implement the UI components shown above
3. Test each feature thoroughly
4. Consider adding push notifications for reactions
5. Add analytics tracking for feature usage

## Optional Enhancements

- **Reaction analytics** - Track most used reactions
- **Custom reactions** - Allow users to add custom emojis
- **Voice message waveforms** - Visual representation of audio
- **Photo galleries** - Multiple photos in one message
- **GIF support** - Integration with GIPHY API
- **Message editing** - Edit sent messages
- **Message deletion** - Delete sent messages
- **Forward messages** - Forward to other conversations
