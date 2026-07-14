import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Share2, Check, Copy, MessageCircle, Twitter, Facebook, Linkedin, Send } from "lucide-react";

type ShareDialogProps = {
  title: string;
  text: string;
  url?: string;
  children?: React.ReactNode;
  triggerClassName?: string;
};

/**
 * Reusable share sheet. Tries the native Web Share API first; falls back to
 * per-platform deep links (WhatsApp, X/Twitter, Facebook, LinkedIn, Telegram)
 * plus a "Copy" option.
 */
export function ShareDialog({ title, text, url, children, triggerClassName }: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.origin : "");
  const fullText = `${text}${shareUrl ? ` ${shareUrl}` : ""}`;
  const encodedText = encodeURIComponent(fullText);
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const openLink = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text, url: shareUrl });
        setOpen(false);
        return;
      } catch {
        /* user cancelled or unsupported — fall back to dialog */
      }
    }
    setOpen(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const channels: Array<{ label: string; icon: any; color: string; href: string }> = [
    {
      label: "WhatsApp",
      icon: MessageCircle,
      color: "from-[#25D366] to-[#128C7E]",
      href: `https://wa.me/?text=${encodedText}`,
    },
    {
      label: "X / Twitter",
      icon: Twitter,
      color: "from-[#0f172a] to-[#1e293b]",
      href: `https://twitter.com/intent/tweet?text=${encodedText}`,
    },
    {
      label: "Facebook",
      icon: Facebook,
      color: "from-[#1877F2] to-[#0b5fc2]",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`,
    },
    {
      label: "LinkedIn",
      icon: Linkedin,
      color: "from-[#0A66C2] to-[#004182]",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}&title=${encodedTitle}&summary=${encodedText}`,
    },
    {
      label: "Telegram",
      icon: Send,
      color: "from-[#229ED9] to-[#1b7fb0]",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    },
  ];

  const trigger = children ? (
    <span onClick={() => setOpen(true)} className="contents">
      {children}
    </span>
  ) : (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleNativeShare();
      }}
      className={
        triggerClassName ??
        "inline-flex items-center gap-1.5 rounded-full border border-[#4f46e5]/30 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4f46e5] shadow-sm transition hover:bg-[#4f46e5]/10"
      }
    >
      <Share2 className="h-3 w-3" /> Share
    </button>
  );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">Share your achievement</DialogTitle>
        </DialogHeader>
        <div className="rounded-2xl border border-border bg-surface p-3 text-sm text-foreground/90">
          {text}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {channels.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => openLink(c.href)}
                className="group flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${c.color} text-white shadow-sm`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-semibold text-foreground/80">{c.label}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold transition hover:bg-surface-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-[#16a34a]" /> Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Copy message
            </>
          )}
        </button>
      </DialogContent>
    </Dialog>
    </>
  );
}
