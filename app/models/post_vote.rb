class PostVote < ApplicationRecord
  belongs_to :user
  belongs_to :post
  enum :vote_type, Enums::VoteType::VALUES, validate: true, presence: true

  after_save :update_post_score

  private

  def update_post_score
    if saved_change_to_vote_type?
      if vote_type_before_last_save == :up_vote
        post.decrement!(:score)
      elsif vote_type_before_last_save == :down_vote
        post.increment!(:score)
      end

      if up_vote?
        post.increment!(:score)
      elsif down_vote?
        post.decrement!(:score)
      end
    end
  end
end
