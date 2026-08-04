import { API_BASE_URL } from "@/lib/api";

export async function uploadImage(file: File): Promise<{ url: string; assetId: string }> {
  const formData = new FormData();
  formData.append("image", file);
  const token = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
  const uploadRes = await fetch(`${API_BASE_URL}/upload/image`, {
    method: "POST",
    credentials: "include",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (!uploadRes.ok) throw new Error("Image upload failed");
  return uploadRes.json();
}
