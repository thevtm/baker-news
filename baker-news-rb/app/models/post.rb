class Post < ApplicationRecord
  belongs_to :user
  has_many :comments, dependent: :destroy

  validates :title, presence: true
  validates :url, presence: true, format: URI::regexp(%w[http https])
end
