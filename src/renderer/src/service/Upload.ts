import axios from 'axios'

type Props = {
  image: string | null
};
//const rawImageUrl ='data:image/jpeg;base64'
export const imageUpload = async ({image}: Props): Promise<string | null> => {
  const rawImageRegex = /^data:image\/\w+/;

  let url: string | null = null;

  if (!image) return url;

  if(!rawImageRegex.test(image)){
    return image;
  }
  const cloudName : string = "dmi3xizxq"
  const formData = new FormData();
  formData.append('file', image);
  formData.append('upload_preset', 'unsigned_preset');
  try {
    const response = await axios.post(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, formData);
    url = response.data.secure_url;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
  return url;
};
