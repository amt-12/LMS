const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

const uploadToS3 = async (fileBuffer, fileName, mimeType) => {
  const s3Key = `study-materials/${Date.now()}-${fileName}`;
  
  const params = {
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: mimeType,
    Metadata: {
      originalName: fileName
    }
  };

  await s3Client.send(new PutObjectCommand(params));
  return s3Key;
};

const generateSignedUrl = async (s3Key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key
  });
  
  return await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
};

const deleteFromS3 = async (s3Key) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: s3Key
  };
  
  await s3Client.send(new DeleteObjectCommand(params));
};

module.exports = {
  uploadToS3,
  generateSignedUrl,
  deleteFromS3
};
