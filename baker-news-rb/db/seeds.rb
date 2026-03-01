# This file should ensure the existence of records required to run the application in every environment (production,
# development, test). The code here should be idempotent so that it can be executed at any point in every environment.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Example:
#
#   ["Action", "Comedy", "Drama", "Horror"].each do |genre_name|
#     MovieGenre.find_or_create_by!(name: genre_name)
#   end

require "faker"

# Users

users = Array.new(10) do
  User.find_or_create_by!(name: Faker::Name.name)
end

# Posts

posts = Array.new(20) do
  Post.find_or_create_by!(
    title: Faker::Lorem.sentence(word_count: Faker::Number.between(from: 1, to: 5)),
    url: Faker::Internet.url(),
    user: users.sample
  )
end

# Comments

comments = Array.new(50) do
  Comment.find_or_create_by!(
    content: Faker::Lorem.sentence(word_count: Faker::Number.between(from: 1, to: 500)),
    post: posts.sample,
    user: users.sample
  )
end

# Post Votes

vote_types = [:up_vote, :up_vote, :up_vote, :down_vote, :no_vote]

100.times do
  PostVote.find_or_create_by!(
    post: posts.sample,
    user: users.sample,

    vote_type: vote_types.sample
  )
end

# Comment Votes

100.times do
  CommentVote.find_or_create_by!(
    comment: comments.sample,
    user: users.sample,
    vote_type: vote_types.sample
  )
end
