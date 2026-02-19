class CreateComments < ActiveRecord::Migration[8.1]
  def change
    create_table :comments do |t|
      t.text :content
      t.integer :score, default: 0, null: false
      t.references :user, null: false, foreign_key: true
      t.references :post, null: false, foreign_key: true
      t.references :parent_comment, foreign_key: { to_table: :comments }

      t.timestamps
    end
  end
end
