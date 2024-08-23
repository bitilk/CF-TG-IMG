addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/file')) {
    return handleFileProxy(request);
  } else if (request.method === 'POST') {
    return handleUpload(request);
  } else {
    return new Response(htmlContent, {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

async function handleFileProxy(request) {
  const url = new URL(request.url);
  const fileUrl = `https://telegra.ph${url.pathname}`;
  
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers
    });
  } catch (error) {
    return new Response(`Failed to proxy request: ${error.message}`, { status: 500 });
  }
}

async function handleUpload(request) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return new Response('No file uploaded', { status: 400 });
  }

  const uploadResponse = await fetch('https://telegra.ph/upload', {
    method: 'POST',
    body: formData
  });

  const result = await uploadResponse.json();
  const imagePath = result[0].src;
  const imageUrl = new URL(request.url);
  const customDomain = ""; // 自定义文件域名(不带https),备用域名也需要指向该项目,如果为空则使用当前域名

  if (customDomain) {
    imageUrl.hostname = customDomain;
  }
  imageUrl.pathname = `${imagePath}`;

  return new Response(JSON.stringify({ url: imageUrl.toString() }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Image Uploader</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            text-align: center;
            background-color: #fff;
            color: #000;
            transition: background-color 0.3s, color 0.3s;
        }
        .dark-mode {
            background-color: #121212;
            color: #ffffff;
        }
        .content {
            margin-top: 20vh;
        }
        .upload-btn-wrapper { 
            position: relative; 
            overflow: hidden; 
            display: inline-block; 
            margin-bottom: 20px;
        }
        .btn { 
            border: none; 
            color: white; 
            background-color: #8a4baf; 
            padding: 15px 30px; 
            border-radius: 25px; 
            font-size: 18px; 
            font-weight: bold; 
            cursor: pointer; 
            transition: background-color 0.3s;
        }
        .btn:hover {
            background-color: #7a3f9d;
        }
        .upload-btn-wrapper input[type=file] { 
            font-size: 100px; 
            position: absolute; 
            left: 0; 
            top: 0; 
            opacity: 0; 
            cursor: pointer;
            height: 100%;
            width: 100%;
        }
        #imageUrl { 
            display: none; 
            margin-top: 20px; 
            word-break: break-all;
            text-align: center;
        }
        #copyButton { 
            display: none; 
            margin-top: 10px; 
            padding: 15px 30px; 
            background-color: #8a4baf; 
            color: white; 
            border: none; 
            border-radius: 25px; 
            cursor: pointer; 
            font-size: 18px;
            font-weight: bold;
            transition: background-color 0.3s;
        }
        #copyButton:hover {
            background-color: #7a3f9d;
        }
        #copyButton.copied {
            background-color: #4CAF50;
        }
        .icon { 
            margin-right: 10px; 
        }
        @keyframes spin { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
        }
        .spin { 
            animation: spin 1s linear infinite; 
            display: inline-block; 
        }
    </style>
</head>
<body>
    <div class="content">
        <h1>Image Uploader</h1>
        <div class="upload-btn-wrapper">
            <button class="btn" id="uploadBtn"><span class="icon">↑</span>Upload your image</button>
            <input type="file" name="file" accept="image/*" id="fileInput">
        </div>
        <div id="imageUrl"></div>
        <button id="copyButton">Copy Link</button>
    </div>

    <script>
        const fileInput = document.getElementById('fileInput');
        const imageUrlDiv = document.getElementById('imageUrl');
        const copyButton = document.getElementById('copyButton');
        const uploadBtn = document.getElementById('uploadBtn');

        // 检查系统的主题设置
        function applyDarkModePreference() {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }

        // 当系统的主题偏好发生变化时
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyDarkModePreference);
        applyDarkModePreference();  // 页面加载时应用主题

        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('file', file);

            uploadBtn.innerHTML = '<span class="icon spin">↻</span>Uploading...';
            uploadBtn.disabled = true;

            // 清除之前的内容
            imageUrlDiv.style.display = 'none';
            imageUrlDiv.textContent = '';
            copyButton.style.display = 'none';

            try {
                const response = await fetch('/', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                
                imageUrlDiv.textContent = data.url;
                imageUrlDiv.style.display = 'block';
                copyButton.style.display = 'inline-block';
            } catch (error) {
                console.error('Error:', error);
                imageUrlDiv.textContent = 'Upload failed. Please try again.';
                imageUrlDiv.style.display = 'block';
            } finally {
                uploadBtn.innerHTML = '<span class="icon">↑</span>Upload your image';
                uploadBtn.disabled = false;
            }
        });

        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(imageUrlDiv.textContent)
                .then(() => {
                    const originalText = copyButton.textContent;
                    copyButton.textContent = 'Copied!✔';
                    copyButton.classList.add('copied');
                    setTimeout(() => {
                        copyButton.textContent = originalText;
                        copyButton.classList.remove('copied');
                    }, 800);
                })
                .catch(err => console.error('Failed to copy: ', err));
        });
    </script>
</body>
</html>
`;
