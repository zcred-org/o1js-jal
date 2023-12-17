import {
  Bool,
  Provable,
  CircuitString,
  ZkProgram,
  Field,
  Poseidon,
  PublicKey,
  Signature,
  Struct,
  UInt64,
} from "o1js";

export class PublicInput extends Struct({ 
  issuer_id_key: PublicKey, 
  subject_id_key: PublicKey, 
  subject_id_type: Field, 
}) {}

export const zkProgram = ZkProgram({
  publicInput: PublicInput,
  methods: {
    execute: {
      privateInputs: [
        Field,
        Field,
        PublicKey,
        Field,
        Field,
        Field,
        Field,
        Field,
        PublicKey,
        Signature,
      ],
      method(
        publicInput,
        private_credential_attributes_issuanceDate,
        private_credential_attributes_subject_birthDate,
        private_credential_attributes_subject_id_key,
        private_credential_attributes_subject_id_type,
        private_credential_attributes_subject_name,
        private_credential_attributes_type,
        private_credential_attributes_validFrom,
        private_credential_attributes_validUntil,
        private_credential_proofs_mina_poseidon_pasta_mina_publickey_B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo_issuer_id_key,
        private_credential_proofs_mina_poseidon_pasta_mina_publickey_B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo_signature,
      ) {
        private_credential_attributes_subject_id_key.equals(publicInput.subject_id_key).assertTrue()
        private_credential_proofs_mina_poseidon_pasta_mina_publickey_B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo_issuer_id_key.equals(publicInput.issuer_id_key).assertTrue()
        const hashedAttributes = Poseidon.hash([
          private_credential_attributes_issuanceDate,
          private_credential_attributes_subject_birthDate,
          ...private_credential_attributes_subject_id_key.toFields(),
          private_credential_attributes_subject_id_type,
          private_credential_attributes_subject_name,
          private_credential_attributes_type,
          private_credential_attributes_validFrom,
          private_credential_attributes_validUntil]) 
        const verified = private_credential_proofs_mina_poseidon_pasta_mina_publickey_B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo_signature.verify(private_credential_proofs_mina_poseidon_pasta_mina_publickey_B62qj2aocCw3Ub1BnQXhUj1omS7dmVEvC3z8dsL2MkLcrw1cUgD3Apo_issuer_id_key, [hashedAttributes]) 
        verified.assertTrue()
      }
    }
  }
});
