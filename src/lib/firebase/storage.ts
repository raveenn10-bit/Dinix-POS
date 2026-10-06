import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage, isFirebaseConfigured } from './config';

/**
 * Convert a File or Blob into a base64 Data URL
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Upload a product image to Firebase Storage (products/{fileName})
 * Provides fallback to Base64 Data URL if Storage is unavailable or unconfigured.
 */
export async function uploadProductImage(
  file: File,
  customName?: string
): Promise<string> {
  const extension = file.name.split('.').pop() || 'jpg';
  const cleanBase = (customName || file.name.split('.')[0] || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  const fileName = `${cleanBase}-${Date.now()}.${extension}`;

  if (!isFirebaseConfigured) {
    console.info('[Storage Fallback] Converting uploaded image to base64 data URL');
    return await fileToDataUrl(file);
  }

  try {
    const storageRef = ref(storage, `products/${fileName}`);
    const metadata = {
      contentType: file.type || 'image/jpeg',
      customMetadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
      },
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.warn('[Storage Error] Falling back to Data URL for image upload:', error);
    // Return Data URL fallback so UI operation does not fail
    return await fileToDataUrl(file);
  }
}

/**
 * Safely delete an image from Firebase Storage if it's hosted there
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  if (!isFirebaseConfigured || !imageUrl || !imageUrl.includes('firebasestorage')) {
    return;
  }

  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (error) {
    console.warn('[Storage] Could not delete image or already deleted:', error);
  }
}
