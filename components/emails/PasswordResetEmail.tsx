import * as React from 'react';

interface PasswordResetEmailProps {
  userName: string;
  resetUrl: string;
}

export function PasswordResetEmail({ userName, resetUrl }: PasswordResetEmailProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reset Your Password</title>
      </head>
      <body style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        lineHeight: '1.6',
        color: '#333333',
        backgroundColor: '#f4f4f4',
        margin: 0,
        padding: 0
      }}>
        <div style={{
          maxWidth: '600px',
          margin: '40px auto',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C00 100%)',
            padding: '40px 20px',
            textAlign: 'center' as const
          }}>
            <h1 style={{
              color: '#ffffff',
              margin: 0,
              fontSize: '28px',
              fontWeight: 600
            }}>
              🐉 Dragon Cave Inventory
            </h1>
          </div>
          
          {/* Content */}
          <div style={{ padding: '40px 30px' }}>
            <h2 style={{
              color: '#333333',
              fontSize: '24px',
              marginBottom: '20px'
            }}>
              Hello {userName}!
            </h2>
            
            <p style={{
              color: '#666666',
              marginBottom: '20px',
              fontSize: '16px'
            }}>
              We received a request to reset your password for your Dragon Cave Inventory account.
            </p>
            
            <p style={{
              color: '#666666',
              marginBottom: '20px',
              fontSize: '16px'
            }}>
              Click the button below to create a new password:
            </p>
            
            {/* Button */}
            <div style={{ textAlign: 'center' as const, margin: '40px 0' }}>
              <a href={resetUrl} style={{
                display: 'inline-block',
                padding: '16px 40px',
                backgroundColor: '#FF6B00',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '16px'
              }}>
                Reset Your Password
              </a>
            </div>
            
            {/* Info Box */}
            <div style={{
              backgroundColor: '#FFF3E0',
              borderLeft: '4px solid #FF6B00',
              padding: '16px',
              margin: '20px 0',
              borderRadius: '4px'
            }}>
              <p style={{
                margin: 0,
                color: '#666666',
                fontSize: '14px'
              }}>
                <strong>⏰ This link will expire in 1 hour</strong> for security purposes.
              </p>
            </div>
            
            <p style={{
              color: '#666666',
              marginBottom: '20px',
              fontSize: '16px'
            }}>
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            <p style={{
              color: '#FF6B00',
              wordBreak: 'break-all' as const,
              fontSize: '14px',
              marginBottom: '20px'
            }}>
              {resetUrl}
            </p>
            
            <p style={{
              color: '#666666',
              marginTop: '40px',
              fontSize: '16px'
            }}>
              If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
            
            <p style={{
              color: '#999999',
              fontSize: '14px',
              marginTop: '30px'
            }}>
              This is an automated message, please do not reply to this email.
            </p>
          </div>
          
          {/* Footer */}
          <div style={{
            backgroundColor: '#f9f9f9',
            padding: '30px',
            textAlign: 'center' as const,
            borderTop: '1px solid #eeeeee'
          }}>
            <p style={{
              color: '#999999',
              fontSize: '14px',
              margin: '5px 0'
            }}>
              <strong>Dragon Cave Inventory</strong>
            </p>
            <p style={{
              color: '#999999',
              fontSize: '14px',
              margin: '5px 0'
            }}>
              Your trusted aquarium fish and accessories store
            </p>
            <p style={{
              color: '#999999',
              fontSize: '14px',
              marginTop: '20px'
            }}>
              Need help? Contact us at support@celestialdrakon.com
            </p>
          </div>
        </div>
      </body>
    </html>
  );
}
