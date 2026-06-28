"use client";

import { useState } from "react";

export default function Home() {
  const [imagePreview, setImagePreview] = useState(null);
  const [numbers, setNumbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [called, setCalled] = useState({});
  const [message, setMessage] = useState("");

  async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    setNumbers([]);
    setCalled({});
    setMessage("");

    const compressedImage = await compressImage(file);

    setImagePreview(compressedImage);
    await extractNumbers(compressedImage);
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
      };

      reader.onerror = reject;

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 1100;

        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", 0.65));
      };

      img.onerror = reject;

      reader.readAsDataURL(file);
    });
  }

  async function extractNumbers(imageDataUrl) {
    setLoading(true);
    setMessage("Scanning image with AI...");

    try {
      const base64Image = imageDataUrl.split(",")[1];

      const response = await fetch("/api/extract-numbers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          image: base64Image
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to scan image");
      }

      const extracted = cleanNumbers(data.numbers || "");

      setNumbers(extracted);

      if (extracted.length === 0) {
        setMessage("No phone numbers found. Try zooming in or taking a clearer photo.");
      } else {
        setMessage(`Found ${extracted.length} phone number(s).`);
      }
    } catch (error) {
      setMessage("Error: " + error.message);
    }

    setLoading(false);
  }

  function cleanNumbers(text) {
    // Match UK phone numbers: mobiles (07/447) and landlines (01/02)
    const possibleNumbers = text.match(/(?:(?:\+44|0)(?:1|2|7)|44(?:1|2|7))\d[\d\s().-]{7,11}/g) || [];

    const cleaned = possibleNumbers
      .map((number) => number.replace(/[^\d+]/g, ""))
      .map((number) => {
        if (number.startsWith("+44")) return number;
        if (number.startsWith("44")) return "+" + number;
        if (number.startsWith("0")) return number;
        return number;
      })
      .filter((number) => {
        const digits = number.replace(/\D/g, "");
        return digits.length >= 10 && digits.length <= 13;
      });

    return [...new Set(cleaned)];
  }

  function toggleCalled(number) {
    setCalled((prev) => ({
      ...prev,
      [number]: !prev[number]
    }));
  }

  function resetApp() {
    setImagePreview(null);
    setNumbers([]);
    setCalled({});
    setMessage("");
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>📷 Picture Call AI</h1>
        <p style={styles.subtitle}>Take a photo of numbers, then tap to call.</p>

        <label style={styles.uploadButton}>
          Take / Upload Photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />
        </label>

        {imagePreview && (
          <img src={imagePreview} alt="Uploaded call list" style={styles.image} />
        )}

        {message && (
          <div style={loading ? styles.infoBox : styles.messageBox}>
            {message}
          </div>
        )}

        {numbers.length > 0 && (
          <div style={styles.list}>
            {numbers.map((number) => (
              <div key={number} style={styles.card}>
                <div
                  style={{
                    ...styles.number,
                    textDecoration: called[number] ? "line-through" : "none",
                    opacity: called[number] ? 0.5 : 1
                  }}
                >
                  {number}
                </div>

                <a href={`tel:${number}`} style={styles.callButton}>
                  ☎️ Call
                </a>

                <button
                  onClick={() => toggleCalled(number)}
                  style={styles.doneButton}
                >
                  {called[number] ? "Undo" : "Mark Called"}
                </button>
              </div>
            ))}
          </div>
        )}

        {(imagePreview || numbers.length > 0) && (
          <button onClick={resetApp} style={styles.resetButton}>
            Scan Another List
          </button>
        )}
      </div>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "16px",
    fontFamily: "Arial, sans-serif"
  },
  container: {
    maxWidth: "500px",
    margin: "0 auto",
    background: "white",
    minHeight: "100vh",
    padding: "20px",
    borderRadius: "12px"
  },
  title: {
    textAlign: "center",
    color: "#2563eb",
    marginBottom: "6px"
  },
  subtitle: {
    textAlign: "center",
    color: "#555",
    marginBottom: "20px"
  },
  uploadButton: {
    display: "block",
    width: "100%",
    background: "#2563eb",
    color: "white",
    padding: "16px",
    borderRadius: "10px",
    textAlign: "center",
    fontWeight: "bold",
    cursor: "pointer",
    boxSizing: "border-box",
    marginBottom: "16px"
  },
  image: {
    width: "100%",
    borderRadius: "10px",
    marginBottom: "16px",
    border: "1px solid #ddd"
  },
  messageBox: {
    padding: "12px",
    borderRadius: "8px",
    background: "#dbeafe",
    marginBottom: "16px"
  },
  infoBox: {
    padding: "12px",
    borderRadius: "8px",
    background: "#fef3c7",
    marginBottom: "16px"
  },
  list: {
    marginTop: "16px"
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "12px",
    marginBottom: "12px",
    background: "#f9fafb"
  },
  number: {
    fontSize: "20px",
    fontWeight: "bold",
    marginBottom: "10px"
  },
  callButton: {
    display: "block",
    background: "#16a34a",
    color: "white",
    padding: "12px",
    borderRadius: "8px",
    textAlign: "center",
    textDecoration: "none",
    fontWeight: "bold",
    marginBottom: "8px"
  },
  doneButton: {
    width: "100%",
    background: "#6b7280",
    color: "white",
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer"
  },
  resetButton: {
    width: "100%",
    background: "#111827",
    color: "white",
    padding: "14px",
    border: "none",
    borderRadius: "8px",
    fontWeight: "bold",
    marginTop: "16px",
    cursor: "pointer"
  }
};
