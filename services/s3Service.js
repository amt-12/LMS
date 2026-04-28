const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');


/* HARDCODED AWS VALUES - PER USER INSTRUCTION (not for production/git) */
const AWS_ACCESS_KEY_ID = 'AKIAXYKJUX53D33EHRF5';
const AWS_SECRET_ACCESS_KEY =  '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';
const AWS_REGION = 'ap-south-1';
const AWS_S3_BUCKET ='lms-aja';

const BUCKET_NAME = AWS_S3_BUCKET;




let s3Client;
const initS3Client = async () => {
  if (s3Client) return s3Client;
  
  try {
  s3Client = new S3Client({
      region: AWS_REGION,
      forcePathStyle: false,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
      }
    });
    
    // Test bucket access
    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
      console.log(`✅ S3 Client + Bucket access confirmed: ${BUCKET_NAME}`);
    } catch (bucketError) {
      console.error(`⚠️ Bucket access failed (check IAM): ${bucketError.message}`);
      // Don't fail init, let operations fail specifically
    }
    
    // Test connection - COMMENTED OUT for debugging UnknownError
    // await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
    // console.log(`✅ S3 Client connected to bucket: ${BUCKET_NAME}`);
    console.log(`✅ S3 Client initialized (bucket test skipped): ${BUCKET_NAME}`);
    return s3Client;
  } catch (error) {
    console.error('❌ S3 connection failed:', error.message);
    throw new Error(`S3 setup error: ${error.message}. Check AWS credentials, IAM permissions, bucket name/region.`);
  }
};

const uploadToS3 = async (fileBuffer, fileName, mimeType, customKey = null, options = {}) => {
  const client = await initS3Client();
  const s3Key = customKey || `study-materials/${Date.now()}-${fileName}`;
  
  const params = {
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: mimeType,
    Metadata: {
      originalName: fileName
    }
  };

  if (options.isPublic) {
    params.ACL = 'public-read';
  }

  try {
    console.log(`📤 Uploading to S3: ${s3Key}, size: ${fileBuffer.length}, type: ${mimeType}, public: ${!!options.isPublic}`);
    await client.send(new PutObjectCommand(params));
    console.log(`✅ Upload success: ${s3Key}`);
    return s3Key;
  } catch (error) {
    console.error('❌ S3 Upload Debug:', {
      message: error.message,
      code: error.$metadata?.httpStatusCode,
      requestId: error.$metadata?.requestId,
      fileSize: fileBuffer?.length,
      contentType: mimeType,
      bucket: BUCKET_NAME,
      key: s3Key
    });
    throw new Error(`S3 upload failed: ${error.message} (check IAM policy for s3:PutObject)`);
  }
};

const generateSignedUrl = async (s3Key, expiresIn = 604800) => {
  const client = await initS3Client();
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key
  });
  
  return await getSignedUrl(client, command, { expiresIn });
};

const getPublicUrl = (s3Key) => {
  return `https://${BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${s3Key}`;
};

const deleteFromS3 = async (s3Key) => {
  const client = await initS3Client();
  const params = {
    Bucket: BUCKET_NAME,
    Key: s3Key
  };
  
  try {
    await client.send(new DeleteObjectCommand(params));
  } catch (error) {
    console.error('S3 delete warning:', error.message);
    // Don't fail on delete
  }
};

const testS3Connection = async () => {
  try {
    const client = await initS3Client();
    // Test bucket head without throw
    try {
      await client.send(new HeadBucketCommand({ Bucket: BUCKET_NAME }));
      return { success: true, bucket: BUCKET_NAME };
    } catch (bucketError) {
      console.error('Bucket access error:', bucketError.message);
      return { success: false, bucket: BUCKET_NAME, error: `Bucket error: ${bucketError.message} (creds valid)` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

module.exports = {
  uploadToS3,
  generateSignedUrl,
  getPublicUrl,
  deleteFromS3,
  testS3Connection
};
