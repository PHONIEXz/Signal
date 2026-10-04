import { disconnectCreator } from "@/lib/creator-disconnect";
export async function DELETE(request:Request) { return disconnectCreator(request,"youtube"); }
