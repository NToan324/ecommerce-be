import mongoose, { InferSchemaType } from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        conversation_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "conversations",
            required: true,
        },
        sender_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        imageUrl: {
            type: String,
            required: true,
        },
        read: { type: Boolean, default: false }
    },
    {
        timestamps: true,
    }
);

const MessageModel = mongoose.model('messages', messageSchema);
type Message = InferSchemaType<typeof messageSchema>

export default MessageModel
export type { Message }