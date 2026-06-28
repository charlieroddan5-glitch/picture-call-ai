"use client";

import { useState } from "react";

export default function Home() {
  const [contacts, setContacts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dispositions, setDispositions] = useState({});
  const [dialing, setDialing] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const compressedImage = await compressImage(file);
    setImagePreview(compressedImage);
    await extractContacts(compressedImage);
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

  async function extractContacts(imageDataUrl) {
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

      const extracted = cleanContacts(data.numbers || "");

      if (extracted.length === 0) {
        setMessage("No contacts found. Try a clearer photo.");
        return;
      }

      setContacts([...contacts, ...extracted]);
      setMessage(`Added ${extracted.length} contact(s). ${contacts.length + extracted.length} total in queue.`);
      setImagePreview(null);
    } catch (error) {
      setMessage("Error: " + error.message);
    }

    setLoading(false);
  }

  function cleanContacts(text) {
    const lines = text.split('\n');
    const cleaned = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // Try to extract name and number (format: "Name - Number")
      const match = line.match(/^(.+?)\s*-\s*([0-9+\s().-]+)$/);
      
      if (match) {
        const name = match[1].trim();
        let number = match[2].replace(/[^\d+]/g, "");

        // Validate it's a UK phone number
        if (number.match(/^(\+?44|0)(1|2|7)\d{9,10}$/)) {
          const digits = number.replace(/\D/g, "");
          if (digits.length >= 10 && digits.length <= 13) {
            // Normalize format
            if (number.startsWith("+44")) {
              cleaned.push({ name, number });
            } else if (number.startsWith("44")) {
              cleaned.push({ name, number: "+" + number });
            } else if (number.startsWith("0")) {
              cleaned.push({ name, number });
            }
          }
        }
      } else {
        // Try to extract just a number without name
        let number = line.replace(/[^\d+]/g, "");
        if (number.match(/^(\+?44|0)(1|2|7)\d{9,10}$/)) {
          const digits = number.replace(/\D/g, "");
          if (digits.length >= 10 && digits.length <= 13) {
            if (number.startsWith("+44")) {
              cleaned.push({ name: "Unknown", number });
            } else if (number.startsWith("44")) {
              cleaned.push({ name: "Unknown", number: "+" + number });
            } else if (number.startsWith("0")) {
              cleaned.push({ name: "Unknown", number });
            }
          }
        }
      }
    }

    return [...new Set(cleaned.map(c => JSON.stringify(c)))].map(c => JSON.parse(c));
  }

  function startCalling() {
    if (contacts.length === 0) {
      setMessage("No contacts in queue");
      return;
    }
    setDialing(true);
    setCurrentIndex(0);
    setMessage("");
  }

  function handleDisposition(disposition) {
    const currentContact = contacts[currentIndex];
    setDispositions({
      ...dispositions,
      [currentIndex]: disposition
    });

    if (currentIndex < contacts.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      showSummary();
    }
  }

  function showSummary() {
    const stats = {
      noAnswer: Object.values(dispositions).filter(d => d === "noAnswer").length,
      notInterested: Object.values(dispositions).filter(d => d === "notInterested").length,
      interested: Object.values(dispositions).filter(d => d === "interested").length,
      booked: Object.values(dispositions).filter(d => d === "booked").length
    };

    setMessage(
      `✓ Complete! No Answer: ${stats.noAnswer} | Not Interested: ${stats.notInterested} | Interested: ${stats.interested} | Booked: ${stats.booked}`
    );
    setDialing(false);
  }

  function resetAll() {
    setContacts([]);
    setCurrentIndex(0);
    setDispositions({});
    setDialing(false);
    setImagePreview(null);
    setMessage("");
  }

  function resetCall() {
    setCurrentIndex(0);
    setDispositions({});
    setDialing(false);
    setMessage("");
  }

  // Dialing Mode
  if (dialing && contacts.length > 0) {
    const currentContact = contacts[currentIndex];
    const isDisposed = dispositions.hasOwnProperty(currentIndex);

    return (
      <main style={styles.page}>
        <div style={styles.container}>
          {/* PROGRESS BAR - Always Visible at Top */}
          <div style={styles.progressSection}>
            <div style={styles.progressText}>
              {currentIndex + 1} / {contacts.length}
            </div>
            <div style={styles.progressBar}>
              <div 
                style={{
                  ...styles.progressFill,
                  width: `${((currentIndex + 1) / contacts.length) * 100}%`
                }}
              />
            </div>
          </div>

          {/* CONTACT INFO */}
          <div style={styles.contactCard}>
            <div style={styles.contactName}>{currentContact.name}</div>
            <div style={styles.contactNumber}>{currentContact.number}</div>

            <a href={`tel:${currentContact.number}`} style={styles.callButtonLarge}>
              ☎️ CALL NOW
            </a>
            
            <div style={styles.callInstructions}>
              When done, tap a button below
            </div>
          </div>

          {/* DISPOSITION BUTTONS - Large & Prominent */}
          <div style={styles.dispositionSection}>
            <button
              onClick={() => handleDisposition("noAnswer")}
              style={{
                ...styles.dispositionBtnLarge,
                ...styles.dispositionBtnGrey,
                ...(dispositions[currentIndex] === "noAnswer" ? styles.dispositionBtnSelected : {})
              }}
            >
              ❌<br/>No Answer
            </button>
            <button
              onClick={() => handleDisposition("notInterested")}
              style={{
                ...styles.dispositionBtnLarge,
                ...styles.dispositionBtnGrey,
                ...(dispositions[currentIndex] === "notInterested" ? styles.dispositionBtnSelected : {})
              }}
            >
              👋<br/>Not Interested
            </button>
            <button
              onClick={() => handleDisposition("interested")}
              style={{
                ...styles.dispositionBtnLarge,
                ...styles.dispositionBtnGreen,
                ...(dispositions[currentIndex] === "interested" ? styles.dispositionBtnSelected : {})
              }}
            >
              ✋<br/>Interested
            </button>
            <button
              onClick={() => handleDisposition("booked")}
              style={{
                ...styles.dispositionBtnLarge,
                ...styles.dispositionBtnBlue,
                ...(dispositions[currentIndex] === "booked" ? styles.dispositionBtnSelected : {})
              }}
            >
              ✅<br/>Booked
            </button>
          </div>

          {/* AUTO-ADVANCE MESSAGE */}
          {isDisposed && currentIndex < contacts.length - 1 ? (
            <div style={styles.autoAdvanceMsg}>
              ↓ Loading next contact...
            </div>
          ) : null}

          {/* FINISH BUTTON */}
          {currentIndex === contacts.length - 1 && isDisposed ? (
            <button onClick={showSummary} style={styles.finishBtn}>
              📊 View Summary
            </button>
          ) : null}

          <button onClick={resetCall} style={styles.cancelBtn}>
            Stop Calling
          </button>
        </div>
      </main>
    );
  }

  // Queue Management Mode
  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>📞 Call Queue</h1>
        <p style={styles.subtitle}>Scan calling lists, build your queue, then dial.</p>

        <label style={styles.uploadButton}>
          📸 Scan / Upload List
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            style={{ display: "none" }}
          />
        </label>

        {imagePreview && (
          <img src={imagePreview} alt="Scanned list" style={styles.image} />
        )}

        {message && (
          <div style={loading ? styles.infoBox : styles.messageBox}>
            {message}
          </div>
        )}

        {contacts.length > 0 && (
          <div style={styles.queueSection}>
            <div style={styles.queueHeader}>
              <h2 style={styles.queueTitle}>Queue: {contacts.length} contact{contacts.length !== 1 ? 's' : ''}</h2>
            </div>

            <div style={styles.contactList}>
              {contacts.map((contact, idx) => (
                <div 
                  key={idx} 
                  style={{
                    ...styles.queueItem,
                    opacity: idx < 5 ? 1 : 0.6
                  }}
                >
                  <div style={styles.queueItemNumber}>{idx + 1}</div>
                  <div style={styles.queueItemDetails}>
                    <div style={styles.queueItemName}>{contact.name}</div>
                    <div style={styles.queueItemPhone}>{contact.number}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.actionButtons}>
              <button onClick={startCalling} style={styles.startBtn}>
                📞 Start Calling ({contacts.length})
              </button>
              <label style={styles.addMoreBtn}>
                ➕ Add Another List
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
              </label>
            </div>

            <button onClick={resetAll} style={styles.resetBtn}>
              Clear Queue
            </button>
          </div>
        )}

        {contacts.length === 0 && !loading && (
          <div style={styles.emptyState}>
            <p>👇 Scan a calling list to get started</p>
          </div>
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
    color: "#666",
    marginBottom: "20px",
    fontSize: "14px"
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
    marginBottom: "16px",
    border: "none"
  },
  image: {
    width: "100%",
    borderRadius: "10px",
    marginBottom: "16px",
    border: "1px solid #ddd",
    maxHeight: "300px"
  },
  messageBox: {
    padding: "12px",
    borderRadius: "8px",
    background: "#dbeafe",
    marginBottom: "16px",
    fontSize: "14px"
  },
  infoBox: {
    padding: "12px",
    borderRadius: "8px",
    background: "#fef3c7",
    marginBottom: "16px",
    fontSize: "14px"
  },
  queueSection: {
    marginTop: "20px"
  },
  queueHeader: {
    marginBottom: "16px"
  },
  queueTitle: {
    fontSize: "18px",
    color: "#1f2937",
    margin: "0 0 12px 0"
  },
  contactList: {
    maxHeight: "300px",
    overflowY: "auto",
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    marginBottom: "16px"
  },
  queueItem: {
    display: "flex",
    padding: "12px",
    borderBottom: "1px solid #f3f4f6",
    alignItems: "flex-start"
  },
  queueItemNumber: {
    fontWeight: "bold",
    color: "#2563eb",
    minWidth: "30px",
    fontSize: "14px"
  },
  queueItemDetails: {
    flex: 1,
    marginLeft: "12px"
  },
  queueItemName: {
    fontWeight: "bold",
    fontSize: "14px",
    color: "#1f2937"
  },
  queueItemPhone: {
    fontSize: "12px",
    color: "#6b7280",
    marginTop: "4px"
  },
  actionButtons: {
    display: "flex",
    gap: "12px",
    marginBottom: "12px"
  },
  startBtn: {
    flex: 1,
    background: "#16a34a",
    color: "white",
    padding: "14px",
    borderRadius: "8px",
    fontWeight: "bold",
    border: "none",
    cursor: "pointer",
    fontSize: "14px"
  },
  addMoreBtn: {
    flex: 1,
    background: "#6b7280",
    color: "white",
    padding: "14px",
    borderRadius: "8px",
    fontWeight: "bold",
    textAlign: "center",
    cursor: "pointer",
    fontSize: "14px",
    display: "block"
  },
  resetBtn: {
    width: "100%",
    background: "#ef4444",
    color: "white",
    padding: "12px",
    borderRadius: "8px",
    fontWeight: "bold",
    border: "none",
    cursor: "pointer",
    fontSize: "14px"
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#9ca3af"
  },
  // Dialing styles
  progressSection: {
    marginBottom: "24px",
    padding: "16px",
    background: "#f0f9ff",
    borderRadius: "10px",
    border: "2px solid #2563eb"
  },
  progressText: {
    textAlign: "center",
    fontSize: "32px",
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: "12px"
  },
  progressBar: {
    height: "12px",
    background: "#e5e7eb",
    borderRadius: "6px",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    background: "#16a34a",
    transition: "width 0.3s ease"
  },
  contactCard: {
    background: "#f9fafb",
    border: "2px solid #2563eb",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "20px",
    textAlign: "center"
  },
  contactName: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: "12px"
  },
  contactNumber: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: "20px",
    fontFamily: "monospace"
  },
  callButtonLarge: {
    display: "block",
    background: "#16a34a",
    color: "white",
    padding: "18px",
    borderRadius: "10px",
    textAlign: "center",
    textDecoration: "none",
    fontWeight: "bold",
    fontSize: "20px",
    marginBottom: "12px"
  },
  callInstructions: {
    fontSize: "12px",
    color: "#6b7280"
  },
  dispositionSection: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "16px"
  },
  dispositionBtnLarge: {
    padding: "20px 12px",
    borderRadius: "10px",
    border: "3px solid",
    background: "white",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
    transition: "all 0.2s",
    lineHeight: "1.4"
  },
  dispositionBtnGrey: {
    borderColor: "#d1d5db",
    color: "#374151"
  },
  dispositionBtnGreen: {
    borderColor: "#16a34a",
    color: "#16a34a"
  },
  dispositionBtnBlue: {
    borderColor: "#2563eb",
    color: "#2563eb"
  },
  dispositionBtnSelected: {
    background: "#2563eb",
    color: "white",
    borderColor: "#2563eb"
  },
  autoAdvanceMsg: {
    textAlign: "center",
    padding: "12px",
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "8px",
    marginBottom: "12px",
    fontSize: "14px",
    fontWeight: "bold"
  },
  finishBtn: {
    width: "100%",
    background: "#16a34a",
    color: "white",
    padding: "14px",
    borderRadius: "8px",
    fontWeight: "bold",
    border: "none",
    cursor: "pointer",
    marginBottom: "12px",
    fontSize: "16px"
  },
  cancelBtn: {
    width: "100%",
    background: "#6b7280",
    color: "white",
    padding: "12px",
    borderRadius: "8px",
    fontWeight: "bold",
    border: "none",
    cursor: "pointer"
  }
};
