export function createSuccessPage(): string {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Successful</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #333;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            padding: 3rem;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 500px;
            width: 90%;
            position: relative;
            overflow: hidden;
        }
        
        .container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #4CAF50, #45a049);
        }
        
        .success-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            animation: bounce 1s ease-in-out;
        }
        
        .title {
            font-size: 2rem;
            margin-bottom: 1rem;
            color: #2c3e50;
            font-weight: 600;
        }
        
        .subtitle {
            font-size: 1.1rem;
            color: #7f8c8d;
            margin-bottom: 2rem;
            line-height: 1.5;
        }
        
        .info-box {
            background: #f8f9fa;
            border-radius: 10px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            border-left: 4px solid #4CAF50;
        }
        
        .info-text {
            color: #2c3e50;
            font-weight: 500;
        }
        
        .close-btn {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: white;
            border: none;
            padding: 0.8rem 2rem;
            border-radius: 25px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
        }
        
        .close-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 15px rgba(76, 175, 80, 0.3);
        }
        
        .footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #eee;
            color: #95a5a6;
            font-size: 0.9rem;
        }
        
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% {
                transform: translateY(0);
            }
            40% {
                transform: translateY(-10px);
            }
            60% {
                transform: translateY(-5px);
            }
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 2rem;
                margin: 1rem;
            }
            
            .title {
                font-size: 1.5rem;
            }
            
            .success-icon {
                font-size: 3rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">🎉</div>
        <h1 class="title">Authentication Successful!</h1>
        <p class="subtitle">You have been successfully authenticated and your access token has been obtained.</p>
        
        <div class="info-box">
            <p class="info-text">Your development environment is now ready to use with OIDC authentication.</p>
        </div>
        
        <button class="close-btn" onclick="window.close()">Close Window</button>
        
        <div class="footer">
            <p>Powered by Vite OIDC Plugin</p>
        </div>
    </div>
    
    <script>
        setTimeout(() => {
            document.querySelector('.container').style.opacity = '1';
        }, 100);
        
        setTimeout(() => {
            window.close();
        }, 5000);
    </script>
</body>
</html>`.trim();
}

export function createErrorPage(): string {
	return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authentication Failed</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            color: #333;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            padding: 3rem;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 500px;
            width: 90%;
            position: relative;
            overflow: hidden;
        }
        
        .container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, #ff6b6b, #ee5a24);
        }
        
        .error-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
            animation: shake 1s ease-in-out;
        }
        
        .title {
            font-size: 2rem;
            margin-bottom: 1rem;
            color: #2c3e50;
            font-weight: 600;
        }
        
        .subtitle {
            font-size: 1.1rem;
            color: #7f8c8d;
            margin-bottom: 2rem;
            line-height: 1.5;
        }
        
        .error-box {
            background: #fff5f5;
            border-radius: 10px;
            padding: 1.5rem;
            margin-bottom: 2rem;
            border-left: 4px solid #ff6b6b;
        }
        
        .error-text {
            color: #e74c3c;
            font-weight: 500;
        }
        
        .actions {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 0.8rem 2rem;
            border-radius: 25px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            font-weight: 500;
            text-decoration: none;
            border: none;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #3498db, #2980b9);
            color: white;
        }
        
        .btn-secondary {
            background: #ecf0f1;
            color: #2c3e50;
        }
        
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 15px rgba(0, 0, 0, 0.2);
        }
        
        .footer {
            margin-top: 2rem;
            padding-top: 1rem;
            border-top: 1px solid #eee;
            color: #95a5a6;
            font-size: 0.9rem;
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 2rem;
                margin: 1rem;
            }
            
            .title {
                font-size: 1.5rem;
            }
            
            .error-icon {
                font-size: 3rem;
            }
            
            .actions {
                flex-direction: column;
            }
            
            .btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">❌</div>
        <h1 class="title">Authentication Failed</h1>
        <p class="subtitle">Something went wrong during the authentication process.</p>
        
        <div class="error-box">
            <p class="error-text">Please check the console for detailed error information and try again.</p>
        </div>
        
        <div class="actions">
            <button class="btn btn-secondary" onclick="window.close()">Close Window</button>
            <button class="btn btn-primary" onclick="window.location.reload()">Try Again</button>
        </div>
        
        <div class="footer">
            <p>Powered by Vite OIDC Plugin</p>
        </div>
    </div>
    
    <script>
        setTimeout(() => {
            document.querySelector('.container').style.opacity = '1';
        }, 100);
    </script>
</body>
</html>`.trim();
}
