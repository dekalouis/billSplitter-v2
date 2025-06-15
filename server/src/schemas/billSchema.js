export const typeDefs = `#graphql
  type Bill {
    _id: ID!
    userId: ID!
    title: String!
    description: String
    imageUrl: String
    ocrData: JSON
    subtotal: Float!
    taxAmount: Float!
    serviceChargeAmount: Float!
    totalAmount: Float!
    participants: [Participant!]!
    items: [Item!]!
    createdAt: String!
    updatedAt: String!
  }

  type Participant {
    _id: ID!
    billId: ID!
    name: String!
    email: String
    totalOwed: Float!
    itemAllocations: [ItemAllocation!]!
    createdAt: String!
  }

  type Item {
    _id: ID!
    billId: ID!
    name: String!
    price: Float!
    quantity: Int!
    allocations: [ItemAllocation!]!
    createdAt: String!
  }

  type ItemAllocation {
    _id: ID!
    itemId: ID!
    participantId: ID!
    billId: ID!
    portion: Float! # 0.0 to 1.0 for percentage-based splitting
    amount: Float!
    item: Item!
    participant: Participant!
    createdAt: String!
  }

  # Input types
  input CreateBillInput {
    title: String!
    description: String
    imageUrl: String
    subtotal: Float!
    taxAmount: Float!
    serviceChargeAmount: Float!
  }

  input UpdateBillInput {
    title: String
    description: String
    subtotal: Float
    taxAmount: Float
    serviceChargeAmount: Float
  }

  input ProcessOCRInput {
    billId: ID!
    ocrData: JSON!
    items: [OCRItemInput!]!
  }

  input OCRItemInput {
    name: String!
    price: Float!
    quantity: Int!
  }

  input CreateParticipantInput {
    billId: ID!
    name: String!
    email: String
  }

  input CreateItemInput {
    billId: ID!
    name: String!
    price: Float!
    quantity: Int!
  }

  input CreateItemAllocationInput {
    itemId: ID!
    participantId: ID!
    portion: Float! # How much of the item this participant should pay for (0.0 to 1.0)
  }

  input UpdateItemAllocationInput {
    allocationId: ID!
    portion: Float!
  }

  # Custom scalar for JSON data
  scalar JSON

  extend type Query {
    # Bill queries
    getBillsByUser: [Bill!]!
    getBillById(id: ID!): Bill
    
    # Participant queries
    getParticipantsByBill(billId: ID!): [Participant!]!
    
    # Item queries
    getItemsByBill(billId: ID!): [Item!]!
    
    # Item allocation queries
    getAllocationsByBill(billId: ID!): [ItemAllocation!]!
    getAllocationsByParticipant(participantId: ID!): [ItemAllocation!]!
  }

  extend type Mutation {
    # Bill mutations
    createBill(input: CreateBillInput!): Bill!
    updateBill(id: ID!, input: UpdateBillInput!): Bill!
    deleteBill(id: ID!): Boolean!
    processOCRData(input: ProcessOCRInput!): Bill!
    
    # Participant mutations
    addParticipant(input: CreateParticipantInput!): Participant!
    updateParticipant(id: ID!, name: String, email: String): Participant!
    removeParticipant(id: ID!): Boolean!
    
    # Item mutations
    addItem(input: CreateItemInput!): Item!
    updateItem(id: ID!, name: String, price: Float, quantity: Int): Item!
    removeItem(id: ID!): Boolean!
    
    # Item allocation mutations
    createItemAllocation(input: CreateItemAllocationInput!): ItemAllocation!
    updateItemAllocation(input: UpdateItemAllocationInput!): ItemAllocation!
    removeItemAllocation(id: ID!): Boolean!
    
    # Bulk operations
    updateMultipleAllocations(allocations: [UpdateItemAllocationInput!]!): [ItemAllocation!]!
    calculateBillTotals(billId: ID!): Bill! # Recalculate all totals for participants
  }
`;
