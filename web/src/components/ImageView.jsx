import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon } from 'lucide-react'

export default function ImageView({ r2FolderName, timestampSeconds }) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [imageUrl, setImageUrl] = useState(null)

  const cdnBase = import.meta.env.VITE_CDN_URL || 'https://cdn.example.com' // Fallback for dev

  useEffect(() => {
    if (r2FolderName && timestampSeconds !== undefined) {
      setIsLoading(true)
      setHasError(false)

      // Calculate which frame to fetch based on our scraper interval (e.g. 5 seconds)
      // Since the scraper saves frame_0, frame_5, frame_10, we round down to nearest 5
      const interval = 5
      const frameIndex = Math.floor(timestampSeconds / interval) * interval

      const newUrl = `${cdnBase}/movies/${r2FolderName}/frame_${frameIndex}.jpg`
      setImageUrl(newUrl)
    }
  }, [r2FolderName, timestampSeconds, cdnBase])

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/5 flex items-center justify-center">
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50">
          <ImageIcon className="w-12 h-12 mb-4 animate-pulse" />
          <span className="text-sm font-medium tracking-widest uppercase">Loading Frame...</span>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center text-error/80 bg-red-950/20">
          <span className="text-sm">Frame not found at this timestamp</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {imageUrl && (
          <motion.img
            key={imageUrl}
            src={imageUrl}
            alt={`Frame at ${timestampSeconds}s`}
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoading ? 0 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 w-full h-full object-cover"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setHasError(true)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}