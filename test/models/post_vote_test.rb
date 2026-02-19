require "test_helper"

class PostVoteTest < ActiveSupport::TestCase
  test "should update post score on create" do
    user = User.create!(name: "Test User")
    post = Post.create!(title: "Test Post", url: "http://example.com", user: user)

    assert_difference -> { post.reload.score }, 1 do
      PostVote.create!(post:, user:, vote_type: :up_vote)
    end

    assert_difference -> { post.reload.score }, -1 do
      PostVote.create!(post:, user:, vote_type: :down_vote)
    end
  end
end
