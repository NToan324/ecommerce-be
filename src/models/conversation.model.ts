import mongoose, { InferSchemaType } from "mongoose";

const conversationSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        admin_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: true,
        },
        last_message: {
            type: String,
        },
        imageUrl: {
            type: String,
        }
    },
    {
        timestamps: true,
    }
);

const ConversationModel = mongoose.model('conversations', conversationSchema);
type Conversation = InferSchemaType<typeof conversationSchema>
export default ConversationModel
export type { Conversation }