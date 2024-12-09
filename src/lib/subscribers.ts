import supabase from "./supabase";

// Add a subscriber
export const addSubscriber = async (chatId: number): Promise<boolean> => {
  const { data } = await supabase
    .from("subscribers")
    .select()
    .eq("chat_id", chatId)
    .single();

  if (data) return false; // Already subscribed

  const { error: insertError } = await supabase
    .from("subscribers")
    .insert([{ chat_id: chatId }]);

  return !insertError;
};

// Remove a subscriber
export const removeSubscriber = async (chatId: number): Promise<boolean> => {
  const { error } = await supabase
    .from("subscribers")
    .delete()
    .eq("chat_id", chatId);

  return !error;
};

// Get all subscribers
export const getSubscribers = async (): Promise<number[]> => {
  const { data, error } = await supabase.from("subscribers").select("chat_id");

  if (error) {
    console.error("Error fetching subscribers:", error);
    return [];
  }

  return data.map((row) => row.chat_id);
};
