import axios from "axios";

const cloud_name = process.env.REACT_APP_CLOUD_NAME;
const upload_preset = process.env.REACT_APP_CLOUD_UPLOAD_PRESET;

export const uploadFiles = async (files) => {
  let uploaded = [];

  for (const f of files) {
    let formData = new FormData();
    formData.append("upload_preset", upload_preset);
    const { file, type } = f;
    formData.append("file", file);

    let res = await uploadToCloudinary(formData, type);
    console.log(res);

    try {
      let res = await uploadToCloudinary(formData);
      uploaded.push({
        file: res,
        type: type,
      });
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }

  return uploaded;
};

const uploadToCloudinary = async (formData) => {
  try {
    const { data } = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloud_name}/raw/upload`,
      formData
    );
    return data;
  } catch (err) {
    console.error("Error in uploadToCloudinary:", err);
    throw err;
  }
};
