import { useState } from 'react';
import useReviewerWorkspace from '../../useReviewerWorkspace.js';
import ReviewerPageShell from '../../shared/ReviewerPageShell.jsx';

function ChatPage() {
  const {
    chatThreads, matches, query, setQuery, feedback, setFeedback,
    selectedChat, setSelectedChat, sentMessages, setSentMessages, setChatThreads,
  } = useReviewerWorkspace();
  const [message, setMessage] = useState('');
  const threads = chatThreads.filter((item) => matches(`${item.subject} ${item.customer} ${item.type}`));
  const activeThread = threads.find((thread) => thread.id === selectedChat?.id) || threads[0];
  const sendMessage = (event) => {
    event.preventDefault();
    if (!message.trim() || !activeThread) return;
    setSentMessages((current) => ({ ...current, [activeThread.id]: [...(current[activeThread.id] || []), message.trim()] }));
    setChatThreads((current) => current.map((thread) => thread.id === activeThread.id ? { ...thread, latest: message.trim(), unread: 0 } : thread));
    setMessage('');
  };
  return (
    <ReviewerPageShell title="Trao đổi kỹ thuật" description="Xử lý trao đổi về tranh chấp đo và hỗ trợ khách hàng." query={query} onSearchChange={setQuery} feedback={feedback} onFeedbackDismiss={() => setFeedback('')}>
      <section className="reviewer-card chat-workspace">
        <aside className="chat-inbox">
          <div className="reviewer-card-heading"><div><h2>Hộp thư</h2><p>{threads.length} cuộc trao đổi</p></div></div>
          {threads.map((thread) => (
            <button className={`chat-thread${activeThread?.id === thread.id ? ' selected' : ''}`} key={thread.id} onClick={() => setSelectedChat(thread)} type="button">
              <span className="chat-avatar">{thread.type === 'CalibrationDispute' ? '!' : '◌'}</span>
              <span className="chat-thread-copy"><strong>{thread.subject}</strong><small>{thread.customer}</small><small>{thread.latest}</small></span>
              {thread.unread > 0 && <span className="unread-count">{thread.unread}</span>}
            </button>
          ))}
          {!threads.length && <p className="reviewer-empty">Không có cuộc trao đổi.</p>}
        </aside>
        {activeThread ? (
          <div className="chat-conversation">
            <header className="conversation-header"><div><strong>{activeThread.subject}</strong><span>{activeThread.customer} · {activeThread.type}</span></div><small>{activeThread.participants}</small></header>
            <div className="conversation-messages">
              <div className="message-bubble"><strong>{activeThread.participants.split(',')[0]}</strong><p>{activeThread.latest}</p><small>Hôm nay · 10:42</small></div>
              {(sentMessages[activeThread.id] || []).map((text, index) => <div className="message-bubble own" key={`${activeThread.id}-${index}`}><strong>Nguyễn Thu Hương</strong><p>{text}</p><small>Vừa gửi · demo</small></div>)}
            </div>
            <form className="chat-composer" onSubmit={sendMessage}><input aria-label="Nhập tin nhắn" onChange={(event) => setMessage(event.target.value)} placeholder="Nhập nội dung trao đổi..." value={message} /><button className="button button-primary" disabled={!message.trim()} type="submit">Gửi</button></form>
          </div>
        ) : <div className="reviewer-empty">Chọn một cuộc trao đổi để xem nội dung.</div>}
      </section>
    </ReviewerPageShell>
  );
}

export default ChatPage;
