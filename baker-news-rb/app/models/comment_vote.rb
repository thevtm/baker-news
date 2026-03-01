class CommentVote < ApplicationRecord
  belongs_to :user
  belongs_to :comment
  enum :vote_type, Enums::VoteType::VALUES, validate: true, presence: true

  after_save :update_comment_score

  private

  def update_comment_score
    if saved_change_to_vote_type?
      if vote_type_before_last_save == :up_vote
        comment.decrement!(:score)
      elsif vote_type_before_last_save == :down_vote
        comment.increment!(:score)
      end

      if up_vote?
        comment.increment!(:score)
      elsif down_vote?
        comment.decrement!(:score)
      end
    end
  end
end
