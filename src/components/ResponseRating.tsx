import { useState } from 'react'
import { Star, Trophy, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/utils/cn'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface ResponseRatingProps {
  modelId: string
  modelName: string
  currentRating?: number
  isWinner?: boolean
  onRate: (rating: number) => void
  onSelectWinner: () => void
  disabled?: boolean
  showWinnerButton?: boolean
}

export function ResponseRating({
  currentRating,
  isWinner,
  onRate,
  onSelectWinner,
  disabled = false,
  showWinnerButton = true,
}: ResponseRatingProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const handleClick = (rating: number) => {
    if (!disabled) {
      onRate(rating)
    }
  }

  const displayRating = hoverRating || currentRating || 0

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Star Rating */}
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleClick(star)}
                    onMouseEnter={() => !disabled && setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    disabled={disabled}
                    className={cn(
                      'p-1 rounded transition-all',
                      disabled
                        ? 'cursor-not-allowed opacity-50'
                        : 'hover:scale-110 cursor-pointer'
                    )}
                  >
                    <Star
                      className={cn(
                        'h-5 w-5 transition-colors',
                        star <= displayRating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-400'
                      )}
                    />
                  </button>
                ))}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Rate this response (1-5 stars)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {currentRating && (
          <span className="text-sm text-muted-foreground ml-1">
            {currentRating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Winner Button */}
      {showWinnerButton && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant={isWinner ? 'default' : 'outline'}
                onClick={onSelectWinner}
                disabled={disabled}
                className={cn(
                  'gap-1.5 h-8',
                  isWinner &&
                    'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                )}
              >
                {isWinner ? (
                  <>
                    <Trophy className="h-4 w-4" />
                    Winner
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4" />
                    Mark Best
                  </>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {isWinner
                  ? 'This response is marked as the best'
                  : 'Mark this as the best response'}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  )
}

interface RatingStatsProps {
  averageRating?: number
  totalRatings?: number
  winCount?: number
  totalResponses?: number
}

export function RatingStats({
  averageRating,
  totalRatings,
  winCount,
  totalResponses,
}: RatingStatsProps) {
  if (!totalRatings || totalRatings === 0) {
    return null
  }

  const winRate =
    winCount && totalResponses ? ((winCount / totalResponses) * 100).toFixed(0) : 0

  return (
    <div className="flex items-center gap-4 text-xs text-muted-foreground">
      {averageRating && (
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
          <span>{averageRating.toFixed(1)} avg</span>
          <span className="text-gray-500">({totalRatings} ratings)</span>
        </div>
      )}

      {winCount !== undefined && winCount > 0 && (
        <div className="flex items-center gap-1">
          <Trophy className="h-3 w-3 text-yellow-500" />
          <span>{winCount} wins</span>
          {totalResponses && <span className="text-gray-500">({winRate}%)</span>}
        </div>
      )}
    </div>
  )
}
