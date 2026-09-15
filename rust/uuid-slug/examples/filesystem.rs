//! Store lowercase UUID filenames and recover their plain, masked and sentinel identities.
use std::{fs, io};
use uuid_slug::{
    Uuid, UuidSlugAlphabet, UuidSlugMigrationFormat, UuidSlugMigrationOptions, UuidV7Generator,
    UuidV7MaskingCodec, UuidV7MaskingCodecOptions, generate_uuid_v4, uuid_v7_test_mask,
};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let directory = std::env::temp_dir().join(format!("uuid-slug-{}", generate_uuid_v4()?));
    fs::create_dir(&directory)?;
    let result = exercise(&directory);
    let cleanup = fs::remove_dir_all(&directory);
    result?;
    cleanup?;
    println!("Plain, masked and sentinel filenames retained their spelling and identity");
    Ok(())
}

fn exercise(directory: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    let masking_codec = UuidV7MaskingCodec::new(UuidV7MaskingCodecOptions {
        masked_slug_alphabet: UuidSlugAlphabet::Base32Hex,
        ..UuidV7MaskingCodecOptions::new(uuid_v7_test_mask())
    })?;
    let mut generator = UuidV7Generator::new();
    let uuid = generator.generate_uuid_v7()?;
    let mut cases = vec![
        (
            uuid.to_plain_uuid_slug(UuidSlugAlphabet::Base32Hex)
                .into_string(),
            uuid,
        ),
        (masking_codec.uuid_to_masked_slug(uuid)?.into_string(), uuid),
    ];
    // Cross digit boundaries; never infer chronology from directory enumeration order.
    let mut chronological = Vec::new();
    for timestamp in [31, 32, 1023, 1024, (1_u64 << 42) - 1] {
        let id = generator.generate_uuid_v7_at(
            std::time::UNIX_EPOCH + std::time::Duration::from_millis(timestamp),
        )?;
        let name = id.to_plain_uuid_slug(UuidSlugAlphabet::Base32Hex);
        chronological.push(name.to_string());
        cases.push((name.into_string(), id));
    }
    cases.extend(
        masking_codec
            .sentinels()
            .iter()
            .map(|entry| (entry.plain_uuid_slug.to_string(), entry.uuid)),
    );
    for (name, expected) in &cases {
        fs::write(directory.join(name), expected.to_string())?;
    }
    let migration_decoder =
        masking_codec.create_uuid_slug_migration_decoder(UuidSlugMigrationOptions {
            accept_plain_uuid_slug: true,
            ..UuidSlugMigrationOptions::default()
        });
    let mut read = 0;
    let mut plain_names = Vec::new();
    for entry in fs::read_dir(directory)? {
        let entry = entry?;
        let name = entry
            .file_name()
            .into_string()
            .map_err(|_| io::Error::other("Filename is not UTF-8"))?;
        let stored = Uuid::from_uuid_string(&fs::read_to_string(entry.path())?)?;
        if chronological.contains(&name) {
            plain_names.push(name.clone());
        }
        let format = if name.len() == 26 {
            UuidSlugMigrationFormat::PlainUuidSlug
        } else {
            UuidSlugMigrationFormat::CurrentMaskedSlug
        };
        if !cases
            .iter()
            .any(|(original, id)| *original == name && *id == stored)
            || migration_decoder.uuid_slug_to_uuid(&name, Some(format))? != stored
        {
            return Err(io::Error::other("Filename spelling or UUID identity changed").into());
        }
        read += 1;
    }
    if read != cases.len() {
        return Err(io::Error::other("The filesystem lost or merged an identifier").into());
    }
    plain_names.sort();
    if plain_names != chronological {
        return Err(io::Error::other("Plain filenames lost timestamp order").into());
    }
    Ok(())
}
