class CreatePostVotes < ActiveRecord::Migration[8.1]
  def change
    create_table :post_votes do |t|
      t.references :user, null: false, foreign_key: true
      t.references :post, null: false, foreign_key: true
      t.string :vote_type, null: false

      t.timestamps
    end
  end
end
