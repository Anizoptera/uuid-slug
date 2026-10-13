pub struct Codec {
    #[deprecated]
    pub seed: u8,
}

impl Codec {
    #[deprecated]
    pub fn decode(&self) {}
}

pub enum Error {
    #[deprecated]
    Legacy,
    Current {
        #[deprecated]
        code: u8,
    },
}

pub trait Decode {
    #[deprecated]
    fn decode(&self);

    #[deprecated]
    const LEGACY: u8;

    #[deprecated]
    type Legacy;
}

#[deprecated]
pub fn old() {}

pub union Union {
    #[deprecated]
    pub old: u8,
    pub current: u8,
}

pub struct Holder<T>(pub T);

impl Holder<fn() -> u8> {
    #[deprecated]
    pub fn deprecated_callback_owner(&self) {}

    pub fn current(&self) {}
}

pub struct Marker<const SYMBOL: char>;

impl Marker<'>'> {
    #[deprecated]
    pub fn deprecated_marker(&self) {}
}
