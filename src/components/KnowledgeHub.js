import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    HiOutlineDocumentText,
    HiOutlineCloudArrowUp,
    HiOutlineTrash,
    HiOutlineArrowPath,
    HiOutlineFolder,
    HiOutlineBars3,
    HiOutlineHome, // ✅ added
} from 'react-icons/hi2';
import { getDocuments, uploadDocument, deleteDocument } from '../services/apiService';

function KnowledgeHub({ sidebarOpen, onToggleSidebar }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const fetchDocuments = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const docs = await getDocuments();
            setDocuments(docs);
        } catch (err) {
            setError('Could not load documents. Make sure the API server is running.');
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleUpload = async (file) => {
        if (!file) return;
        setUploading(true);
        try {
            const doc = await uploadDocument(file);
            setDocuments((prev) => [doc, ...prev]);
        } catch (err) {
            setError('Failed to upload document.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await deleteDocument(id);
            setDocuments((prev) => prev.filter((d) => d.id !== id));
        } catch (err) {
            setError('Failed to delete document.');
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
        e.target.value = '';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleUpload(file);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = () => {
        setDragOver(false);
    };

    const formatSize = (bytes) => {
        if (!bytes) return '—';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <main className={`chat-area ${sidebarOpen ? 'with-sidebar' : 'full'}`}>

            {/* ✅ HEADER FIXED */}
            <div className="chat-header">
                <div className="header-left">

                    {/* ✅ Only this is conditional */}
                    {!sidebarOpen && (
                        <button
                            className="sidebar-open-btn"
                            onClick={onToggleSidebar}
                        >
                            <HiOutlineBars3 size={20} />
                        </button>
                    )}

                    {/* ✅ ALWAYS visible */}
                    <button
                        className="sidebar-open-btn home-btn"
                        onClick={() => window.location.reload()}
                        title="Go to Home"
                    >
                        <HiOutlineHome size={20} />
                    </button>

                    {/* Title */}
                    <div className="kh-header-title">
                        <HiOutlineFolder size={20} />
                        <span>Knowledge Hub</span>
                    </div>

                </div>
                                


            </div>

            {/* CONTENT */}
            <div className="knowledge-hub">

                <div className="knowledge-header">

                    <div className="knowledge-actions">
                        <button className="kh-btn kh-btn-secondary" onClick={fetchDocuments}>
                            <HiOutlineArrowPath size={16} />
                            Refresh
                        </button>

                        <button
                            className="kh-btn kh-btn-primary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                        >
                            <HiOutlineCloudArrowUp size={16} />
                            {uploading ? 'Uploading...' : 'Upload Document'}
                        </button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                    </div>
                </div>

                {/* Drop zone */}
                <div
                    className={`drop-zone ${dragOver ? 'active' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    <HiOutlineCloudArrowUp size={36} />
                    <p>Drag & drop a document here to upload</p>
                    <span>or click "Upload Document" above</span>
                </div>

                {/* Error */}
                {error && (
                    <div className="kh-error">
                        {error}
                        <button onClick={() => setError(null)}>✕</button>
                    </div>
                )}

                {/* Documents */}
                <div className="documents-container">
                    {loading ? (
                        <div className="kh-empty-state">
                            <div className="typing-indicator">
                                <div className="dot" />
                                <div className="dot" />
                                <div className="dot" />
                            </div>
                            <p>Loading documents...</p>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="kh-empty-state">
                            <HiOutlineDocumentText size={48} />
                            <h3>No documents yet</h3>
                        </div>
                    ) : (
                        <table className="documents-table">
                            <thead>
                                <tr>
                                    <th>Document</th>
                                    <th>Size</th>
                                    <th>Uploaded</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {documents.map((doc) => (
                                    <tr key={doc.id}>
                                        <td className="doc-name-cell">
                                            <HiOutlineDocumentText size={18} />
                                            <span>{doc.filename}</span>
                                        </td>
                                        <td>{formatSize(doc.size)}</td>
                                        <td>{formatDate(doc.uploadedAt)}</td>
                                        <td>
                                            <button
                                                className="doc-delete-btn"
                                                onClick={() => handleDelete(doc.id)}
                                            >
                                                <HiOutlineTrash size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

            </div>
        </main>
    );
}

export default KnowledgeHub;