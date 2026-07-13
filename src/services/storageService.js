import { supabase } from '../lib/supabase';

// Helper to convert base64 data to a binary Blob client-side
function base64ToBlob(base64String) {
  const parts = base64String.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
}

export const storageService = {
  async uploadBase64(base64Data, type) {
    const blob = base64ToBlob(base64Data);
    const mimeType = blob.type;
    
    // Determine extension
    const extMap = {
      'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
      'image/gif': 'gif', 'image/webp': 'webp', 'application/pdf': 'pdf',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    };
    
    const ext = extMap[mimeType] || 'bin';
    const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${ext}`;
    
    const isImage = mimeType.startsWith('image/');
    let bucket = '';
    let folder = '';
    
    if (type === 'seed') {
      bucket = 'file_upload';
      folder = 'seeds';
    } else {
      bucket = isImage ? 'farm-visit-photos' : 'farmer-documents';
      folder = isImage ? 'visits' : 'documents';
    }

    const filePath = `${folder}/${filename}`;
    
    // Upload blob to Supabase Storage
    const { error } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        contentType: mimeType,
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      url: publicUrl,
      filename
    };
  },

  async uploadFile(bucketName, filePath, file) {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        upsert: true
      });

    if (error) throw error;
    return data;
  },

  async getSignedUrl(bucketName, filePath, expirySeconds = 3600) {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, expirySeconds);

    if (error) throw error;
    return data.signedUrl;
  },

  getPublicUrl(bucketName, filePath) {
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);
    return data.publicUrl;
  }
};

export default storageService;
