require "test_helper"

class CommentVoteTest < ActiveSupport::TestCase
  test "should update comment score on create" do
    user = User.create!(name: "Test User")
    post = Post.create!(title: "Test Post", url: "http://example.com", user:)
    comment = Comment.create!(content: "Test Comment", post:, user:)

    assert_difference -> { comment.reload.score }, 1 do
      CommentVote.create!(comment:, user:, vote_type: :up_vote)
    end

    assert_difference -> { comment.reload.score }, -1 do
      CommentVote.create!(comment:, user:, vote_type: :down_vote)
    end
  end
end
