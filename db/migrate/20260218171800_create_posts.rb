class CreatePosts < ActiveRecord::Migration[8.1]
  def change
    create_table :posts do |t|
      t.string :title
      t.string :url
      t.integer :score, default: 0, null: false
      t.references :user, null: false, foreign_key: true

      t.timestamps
    end
  end
end

