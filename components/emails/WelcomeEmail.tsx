import * as React from 'react';

interface WelcomeEmailProps {
  userName: string;
  appUrl?: string;
}

export function WelcomeEmail({ userName, appUrl = 'http://localhost:3000' }: WelcomeEmailProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to Celestial Drakon Aquatics</title>
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
              fontSize: '32px',
              fontWeight: 600
            }}>
              🐉 Welcome to Celestial Drakon Aquatics!
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
              Thank you for joining Celestial Drakon Aquatics! We're thrilled to have you as part of our aquarium community.
            </p>
            
            <p style={{
              color: '#666666',
              marginBottom: '20px',
              fontSize: '16px'
            }}>
              🐠 Explore our wide selection of exotic fish, premium aquarium tanks, and high-quality accessories to create your dream aquatic paradise.
            </p>
            
            <p style={{
              color: '#666666',
              marginBottom: '10px',
              fontSize: '16px',
              fontWeight: 600
            }}>
              What you can do with your account:
            </p>
            <ul style={{
              color: '#666666',
              paddingLeft: '20px',
              fontSize: '16px',
              marginBottom: '20px'
            }}>
              <li style={{ marginBottom: '10px' }}>Browse and purchase aquarium fish and accessories</li>
              <li style={{ marginBottom: '10px' }}>Make reservations for live fish</li>
              <li style={{ marginBottom: '10px' }}>Track your orders and reservations</li>
              <li style={{ marginBottom: '10px' }}>Manage your profile and preferences</li>
            </ul>
            
            {/* CTA Button */}
            <div style={{ textAlign: 'center' as const, margin: '40px 0' }}>
              <a href={`${appUrl}/client/dashboard`} style={{
                display: 'inline-block',
                padding: '16px 40px',
                backgroundColor: '#FF6B00',
                color: '#ffffff',
                textDecoration: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '16px'
              }}>
                Start Shopping
              </a>
            </div>
            
            <p style={{
              color: '#666666',
              marginTop: '30px',
              fontSize: '16px'
            }}>
              If you have any questions or need assistance, our team is here to help!
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
              <strong>Celestial Drakon Aquatics</strong>
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
