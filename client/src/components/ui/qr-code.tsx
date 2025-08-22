interface QRCodeDisplayProps {
  value: string;
  size?: number;
}

export default function QRCodeDisplay({ value, size = 200 }: QRCodeDisplayProps) {
  // Using a QR code API service for simplicity
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  
  return (
    <div className="flex items-center justify-center" data-testid="qr-code-container">
      <img
        src={qrCodeUrl}
        alt="QR Code"
        className="border border-gray-200 rounded-lg"
        width={size}
        height={size}
        data-testid="qr-code-image"
      />
    </div>
  );
}
